import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { Search, MapPin, ChevronRight, Star } from 'lucide-react-native';

const { width } = Dimensions.get('window');

import { getMenu } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES = [
  { id: 'All', name: 'All', emoji: '🍽️' },
  { id: 'Breakfast', name: 'Breakfast', emoji: '🥞' },
  { id: 'Lunch', name: 'Lunch', emoji: '🍛' },
  { id: 'Snacks', name: 'Snacks', emoji: '🥪' },
  { id: 'Fast Food', name: 'Fast Food', emoji: '🍔' },
  { id: 'Drinks', name: 'Drinks', emoji: '🥤' },
  { id: 'Desserts', name: 'Desserts', emoji: '🍦' },
  { id: 'South Indian', name: 'South Indian', emoji: '🥘' },
  { id: 'Chinese', name: 'Chinese', emoji: '🍜' },
];

export default function HomePage({ navigation }) {
  const [greeting, setGreeting] = React.useState('');
  const [userName, setUserName] = React.useState('User');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  React.useEffect(() => {
    const loadData = async () => {
      const name = await AsyncStorage.getItem('userName');
      setUserName(name || 'User');

      try {
        // Fetch real menu items from backend
        const menuData = await getMenu();
        setItems(menuData);
      } catch (err) {
        console.error("Failed to load menu on home", err);
      }
    };
    loadData();

    // Set dynamic greeting
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    };
    updateGreeting();
    // Update every minute to be safe
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate popular items based on sales (Top 4)
  const popularItems = [...items].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 4);
  // If search is active, show all matches. If not, only show popular ones.
  const displayItems = searchQuery ? filteredItems : popularItems;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {userName}! ☀️</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={COLORS.primary} />
            <Text style={styles.location}>Main Canteen, Campus</Text>
          </View>
        </View>

      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Search Bar - ACTIVE */}
        <View style={styles.searchContainer}>
          <Search color={COLORS.textLight} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for food..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => navigation.navigate('Menu', { search: searchQuery })}
            returnKeyType="search"
          />
        </View>

        {/* Hero Banner - Only show if not searching */}
        {searchQuery === '' && (
          <View style={styles.heroContainer}>
            <View style={styles.heroContent}>
              <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('Menu')}>
                <Text style={styles.heroBtnText}>Order Now</Text>
              </TouchableOpacity>
            </View>
            <Image
              source={{ uri: 'https://img.freepik.com/free-photo/exploding-burger-with-vegetables-melted-cheese-black-background_23-2149027942.jpg' }}
              style={styles.heroImage}
            />
          </View>
        )}


        {/* Categories - Wrapped Grid */}
        {searchQuery === '' && (
          <View style={{ marginBottom: SPACING.l }}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.l }}>
              {CATEGORIES.map((cat, index) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    selectedCategory === cat.name && styles.activeCategory,
                    { marginBottom: 10 } // Add vertical spacing for wrapped items
                  ]}
                  onPress={() => navigation.navigate('Menu', { category: cat.name })}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryText, selectedCategory === cat.name && styles.activeCategoryText]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Popular / Search Results */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{searchQuery ? 'Search Results' : 'Popular Now'}</Text>
          {!searchQuery && (
            <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.featuredGrid}>
          {displayItems.length === 0 ? (
            <Text style={{ marginLeft: 20, color: '#888' }}>No items found</Text>
          ) : (
            displayItems.map((item) => (
              <TouchableOpacity
                key={item.id || item._id}
                style={styles.foodCard}
                onPress={() => navigation.navigate('Menu')} // Go to menu to order
              >

                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.name}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>₹{item.price}</Text>
                    <View style={styles.addBtn}>
                      <ChevronRight size={16} color={COLORS.white} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.l, paddingVertical: SPACING.m
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, opacity: 0.7 },
  location: { fontSize: 14, color: COLORS.text, marginLeft: 4 },
  profileBtn: { padding: 2, borderWidth: 2, borderColor: COLORS.primary, borderRadius: 25 },
  profileImg: { width: 40, height: 40, borderRadius: 20 },

  searchContainer: {
    marginHorizontal: SPACING.l, marginBottom: SPACING.l,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, padding: SPACING.m, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border
  },
  searchText: { marginLeft: SPACING.s, color: COLORS.textLight },

  heroContainer: {
    marginHorizontal: SPACING.l, marginBottom: SPACING.l,
    backgroundColor: COLORS.primary, borderRadius: 20,
    height: 160, overflow: 'hidden', flexDirection: 'row',
    ...SHADOWS.medium
  },
  heroContent: { flex: 1, padding: SPACING.l, justifyContent: 'center' },
  heroTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: SPACING.m },
  heroBtn: { backgroundColor: COLORS.white, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: 'flex-start' },
  heroBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
  heroImage: { width: '45%', height: '100%', resizeMode: 'cover' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginLeft: SPACING.l, marginBottom: SPACING.m },
  categoryScroll: { paddingLeft: SPACING.l, marginBottom: SPACING.l },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 30, marginRight: SPACING.m,
    borderWidth: 1, borderColor: COLORS.border
  },
  activeCategory: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryEmoji: { marginRight: 6 },
  categoryText: { fontWeight: '600', color: COLORS.text },
  activeCategoryText: { color: COLORS.white },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: SPACING.l },
  seeAll: { color: COLORS.primary, fontWeight: 'bold', marginBottom: SPACING.m },

  featuredGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.l, justifyContent: 'space-between' },
  foodCard: {
    width: (width - SPACING.l * 3) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.l,
    ...SHADOWS.light
  },
  foodImage: { width: '100%', height: 120, resizeMode: 'cover' },
  foodInfo: { padding: SPACING.m },
  foodName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ratingText: { fontSize: 12, color: COLORS.textLight, marginLeft: 4, fontWeight: 'bold' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, padding: 6, borderRadius: 20 }
});