import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/providers/app_state_provider.dart';
import '../../models/product.dart';
import '../auth/auth_screen.dart';
import '../cart/cart_screen.dart';
import '../catalog/catalog_screen.dart';
import '../chat/user_chat_screen.dart';
import '../checkout/checkout_screen.dart';
import '../home/home_screen.dart';
import '../product/product_detail_screen.dart';
import '../profile/profile_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      HomeScreen(
        onProductSelected: _onProductSelected,
        onExploreCatalog: _onExploreCatalog,
        onRequireAuth: () {
          _onRequireAuth();
        },
        onOpenChat: _onOpenChat,
      ),
      CatalogScreen(
        onProductSelected: _onProductSelected,
        onRequireAuth: () {
          _onRequireAuth();
        },
      ),
      CartScreen(
        onProductSelected: _onProductSelected,
        onRequireAuth: () {
          _onRequireAuth();
        },
        onCheckout: _onCheckout,
      ),
      ProfileScreen(
        onRequireAuth: () {
          _onRequireAuth();
        },
      ),
    ];
  }

  void _onProductSelected(Product product) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(
          product: product,
          onRequireAuth: () {
            _onRequireAuth();
          },
        ),
      ),
    );
  }

  void _onExploreCatalog() {
    setState(() {
      _selectedIndex = 1; // Switch to catalog tab
    });
  }

  Future<void> _onRequireAuth() async {
    final appState = context.read<AppStateProvider>();
    if (appState.isAuthenticated) {
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => FractionallySizedBox(
        heightFactor: 0.95,
        child: AuthScreen(onSupportChat: _onOpenChat),
      ),
    );
  }

  void _onOpenChat() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const UserChatScreen()),
    );
  }

  void _onCheckout() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CheckoutScreen(
          onOrderPlaced: () {
            Navigator.of(context).pop();
          },
          onRequireAuth: () {
            Navigator.of(context).pop();
            _onRequireAuth();
          },
        ),
      ),
    );
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shop),
            label: 'Catalog',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_cart),
            label: 'Cart',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey.shade600,
        onTap: _onItemTapped,
      ),
    );
  }
}