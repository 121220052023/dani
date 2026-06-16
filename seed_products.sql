-- SQL to seed high-quality products into the Supabase database
-- Run this in the Supabase SQL Editor

-- Clean old mock data first
DELETE FROM public.products WHERE id != '00000000-0000-0000-0000-000000000000';

-- Insert premium products
INSERT INTO public.products (name, description, category, brand, price, discount_percent, stock, tags, image_url, is_best_seller, is_featured, is_hot_deal)
VALUES 
  (
    'iPhone 15 Pro Max', 
    'The ultimate iPhone with aerospace-grade titanium design, A17 Pro chip, and a more advanced 48MP Main camera system.', 
    'Electronics', 
    'Apple', 
    1199.99, 
    5, 
    50, 
    ARRAY['smartphone', 'apple', 'ios', '5g'], 
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1000&auto=format&fit=crop', 
    true, 
    true, 
    false
  ),
  (
    'Sony WH-1000XM5', 
    'Industry-leading noise canceling headphones with Auto NC Optimizer, crystal clear hands-free calling, and up to 30 hours of battery life.', 
    'Audio', 
    'Sony', 
    398.00, 
    15, 
    120, 
    ARRAY['headphones', 'wireless', 'noise-canceling', 'audio'], 
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1000&auto=format&fit=crop', 
    true, 
    false, 
    true
  ),
  (
    'MacBook Air M3', 
    'Supercharged by M3, the 13-inch MacBook Air is incredibly portable and features a Liquid Retina display, delivering up to 18 hours of battery life.', 
    'Computers', 
    'Apple', 
    1099.00, 
    0, 
    45, 
    ARRAY['laptop', 'macbook', 'apple', 'm3'], 
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop', 
    false, 
    true, 
    false
  ),
  (
    'Samsung 65" Class OLED 4K S90C', 
    'Experience deep blacks, clean whites, and lively colors powered by Quantum Dot technology on this gorgeous ultra-thin 4K Smart TV.', 
    'Home Entertainment', 
    'Samsung', 
    1599.99, 
    20, 
    15, 
    ARRAY['tv', 'oled', '4k', 'smart-tv'], 
    'https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=1000&auto=format&fit=crop', 
    false, 
    true, 
    true
  ),
  (
    'Dyson V15 Detect Vacuum', 
    'The most powerful, intelligent cordless vacuum. Counts and sizes particles, automatically adapting suction power.', 
    'Home Appliances', 
    'Dyson', 
    749.99, 
    10, 
    30, 
    ARRAY['vacuum', 'home', 'cleaning', 'cordless'], 
    'https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=1000&auto=format&fit=crop', 
    true, 
    false, 
    false
  ),
  (
    'Nike Air Max 270', 
    'The Nike Air Max 270 delivers visible air under every step. Updated for modern comfort with nods to the original 1991 Air Max 180.', 
    'Footwear', 
    'Nike', 
    160.00, 
    0, 
    200, 
    ARRAY['shoes', 'sneakers', 'sports', 'running'], 
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop', 
    true, 
    false, 
    false
  ),
  (
    'Apple Watch Series 9', 
    'The most powerful chip in Apple Watch ever. A magical new way to use your watch without touching the screen.', 
    'Wearables', 
    'Apple', 
    399.00, 
    5, 
    85, 
    ARRAY['watch', 'smartwatch', 'fitness', 'apple'], 
    'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?q=80&w=1000&auto=format&fit=crop', 
    false, 
    true, 
    false
  ),
  (
    'DJI Air 3 Drone', 
    'Compact foldable drone with dual cameras, 46-min max flight time, omnidirectional obstacle sensing, and O4 HD video transmission.', 
    'Cameras', 
    'DJI', 
    1099.00, 
    0, 
    20, 
    ARRAY['drone', 'camera', 'photography', 'video'], 
    'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?q=80&w=1000&auto=format&fit=crop', 
    false, 
    true, 
    false
  );
