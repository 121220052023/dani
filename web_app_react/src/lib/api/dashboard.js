import { requireClient, withRetry, monthKey, monthLabel, activityStatus, activityLabel, ROLE_LABELS } from "./client";

export async function fetchDashboardData() {
  return withRetry(async () => {
    const client = requireClient();

    // Fetch main data in parallel
    const [
      ordersRes,
      productsRes,
      profilesRes,
      currentUserRes,
    ] = await Promise.all([
      client
        .from("orders")
        .select("id, total_amount, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(500),
      client
        .from("products")
        .select("id, name, stock, is_best_seller, is_featured, is_hot_deal, category, price, created_at")
        .limit(1000),
      client
        .from("profiles")
        .select("id, email, full_name, role, created_at, last_seen_at")
        .limit(1000),
      client.auth.getUser(),
    ]);

    // Fetch order items separately
    const { data: orderItems, error: itemsError } = await client
      .from("order_items")
      .select("quantity, order_id, product_id, products(name, category)")
      .limit(1000);

    if (itemsError) throw itemsError;

    // Fetch favorites with product and user details
    const { data: favoritesData, error: favoritesError } = await client
      .from("favorites")
      .select(`
        id,
        created_at,
        user:user_id (id, email, full_name),
        product:product_id (id, name, price, category, image_url)
      `)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (favoritesError) throw favoritesError;

    // Fetch recent chat messages for activity feed
    const { data: recentMessages, error: messagesError } = await client
      .from("chat_messages")
      .select(`
        id,
        created_at,
        sender_type,
        thread:thread_id (
          user:user_id (full_name, email, avatar_url)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (messagesError) throw messagesError;

    // Validate main responses
    for (const result of [ordersRes, productsRes, profilesRes]) {
      if (result.error) throw result.error;
    }

    const orders = ordersRes.data ?? [];
    const products = productsRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const currentUserId = currentUserRes.data?.user?.id ?? null;

    const today = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(
        today.getFullYear(),
        today.getMonth() - (5 - index),
        1,
      );
      return {
        key: monthKey(date),
        name: monthLabel(date),
      };
    });

    const revenueSeries = months.map((month) => {
      const monthlyOrders = orders.filter(
        (order) => monthKey(order.created_at) === month.key,
      );
      return {
        name: month.name,
        revenue: monthlyOrders.reduce(
          (sum, order) => sum + Number(order.total_amount ?? 0),
          0,
        ),
        orders: monthlyOrders.length,
      };
    });

    const bestSellerTotals = (orderItems ?? []).reduce((accumulator, item) => {
      const name = item.products?.name ?? "Unknown product";
      accumulator[name] = (accumulator[name] ?? 0) + Number(item.quantity ?? 0);
      return accumulator;
    }, {});

    const bestSellers = Object.entries(bestSellerTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name, value]) => ({ name, value }));

    const orderStatuses = orders.reduce((accumulator, order) => {
      accumulator[order.status] = (accumulator[order.status] ?? 0) + 1;
      return accumulator;
    }, {});

    const orderBars = [
      { name: "Preparing", value: orderStatuses.Preparing ?? 0 },
      { name: "Shipped", value: orderStatuses.Shipped ?? 0 },
      { name: "On the way", value: orderStatuses["On the way"] ?? 0 },
      { name: "Delivered", value: orderStatuses.Delivered ?? 0 },
    ];

    // Build activity feed from orders and chat messages
    const activityFeed = [
      ...orders.slice(0, 5).map((order) => ({
        id: `order-${order.id}`,
        actor: profiles.find((p) => p.id === order.user_id)?.full_name ?? "Customer",
        action: `placed order ${order.id}`,
        created_at: order.created_at,
      })),
      ...(recentMessages || []).slice(0, 5).map((message) => ({
        id: `message-${message.id}`,
        actor: message.thread?.user?.full_name ?? message.thread?.user?.email ?? 'Customer',
        action: `sent message in chat`,
        created_at: message.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

    const employeeTracking = profiles
      .filter((profile) =>
        ["admin", "sales", "marketing"].includes(profile.role),
      )
      .map((profile) => ({
        id: profile.id,
        name: profile.full_name ?? profile.email,
        email: profile.email,
        role: ROLE_LABELS[profile.role] ?? profile.role,
        status:
          profile.id === currentUserId
            ? "Active"
            : activityStatus(profile.last_seen_at ?? profile.created_at),
        screenTime:
          profile.id === currentUserId
            ? "Live now"
            : activityLabel(profile.last_seen_at ?? profile.created_at),
      }));

    // Process favorites by product
    const favoritesByProduct = (favoritesData ?? []).reduce((acc, fav) => {
      const productId = fav.product_id;
      if (!acc[productId]) {
        acc[productId] = {
          product: fav.product,
          count: 0,
          latestAdd: fav.created_at,
        };
      }
      acc[productId].count++;
      if (new Date(fav.created_at) > new Date(acc[productId].latestAdd)) {
        acc[productId].latestAdd = fav.created_at;
      }
      return acc;
    }, {});

    const mostFavorited = Object.values(favoritesByProduct)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        name: item.product?.name ?? 'Unknown Product',
        count: item.count,
        image: item.product?.image_url,
        price: item.product?.price ?? 0,
      }));

    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.total_amount ?? 0),
      0,
    );

    const formatCurrency = (n) =>
      "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Calculate monthly comparison
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    const thisMonthOrders = orders.filter(o => o.created_at?.slice(0, 7) === thisMonth);
    const lastMonthOrders = orders.filter(o => o.created_at?.slice(0, 7) === lastMonth);
    const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : thisMonthRevenue > 0 ? "+100" : "0";
    const orderChange = lastMonthOrders.length > 0
      ? ((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length * 100).toFixed(1)
      : thisMonthOrders.length > 0 ? "+100" : "0";

    return {
      summaryCards: [
        {
          label: "Revenue",
          value: formatCurrency(totalRevenue),
          meta: `${revenueChange >= 0 ? '+' : ''}${revenueChange}% from last month`,
          tone: "success",
        },
        {
          label: "Orders",
          value: orders.length,
          meta: `${orderChange >= 0 ? '+' : ''}${orderChange}% from last month`,
          tone: "primary",
        },
        {
          label: "Users",
          value: profiles.length,
          meta: `${profiles.filter(p => p.role === 'retail').length} customers`,
          tone: "warning",
        },
        {
          label: "Products",
          value: products.length,
          meta: `${products.filter(p => p.stock < 10).length} low stock`,
          tone: "danger",
        },
      ],
      revenueSeries,
      bestSellers,
      orderBars,
      activityFeed,
      employeeTracking,
      mostFavorited,
    };
  });
}

export async function fetchAnalyticsData() {
  const [dashboard, orders, products] = await Promise.all([
    fetchDashboardData(),
    (await import("./orders.js")).fetchOrders(),
    (await import("./products.js")).fetchProducts(),
  ]);

  const ordersByDay = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      day: date.toLocaleString("en-US", { weekday: "short" }),
      orders: orders.filter((order) => order.created_at.slice(0, 10) === key)
        .length,
    };
  });

  const categoryMix = products.reduce((accumulator, product) => {
    accumulator[product.category] = (accumulator[product.category] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    ...dashboard,
    ordersByDay,
    categoryMix: Object.entries(categoryMix).map(([name, value]) => ({
      name,
      value,
    })),
  };
}
