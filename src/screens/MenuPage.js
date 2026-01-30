import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Star } from 'lucide-react-native';
import { getMenu } from '../lib/api';
import { useCart } from '../context/CartContext';
import { COLORS, SPACING, SHADOWS } from '../theme';

export default function MenuPage({ route }) {
  const [menu, setMenu] = useState([]);
  const [filteredMenu, setFilteredMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  const { category, search } = route.params || {};

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const items = await getMenu();
        setMenu(items);

        // Apply initial filters
        let results = items;
        if (category && category !== 'All') {
          results = results.filter(i => i.category === category);
        }
        if (search) {
          results = results.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
        }
        setFilteredMenu(results);
      } catch (err) {
        console.error("Failed to fetch menu");
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [category, search]);

  const displayTitle = search ? `Results for "${search}"` : (category && category !== 'All' ? `${category} Menu` : 'Our Menu');

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>{displayTitle}</Text>
      <FlatList
        data={filteredMenu}
        keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.ratingRow}>
                  <Star size={12} fill={COLORS.secondary} color={COLORS.secondary} />
                  <Text style={styles.ratingText}>{item.rating || '4.0'}</Text>
                </View>
              </View>
              <Text style={styles.itemCategory}>{item.category}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addToCart(item)}
                >
                  <Plus color={COLORS.white} size={20} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textLight }}>No items found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, padding: SPACING.l },
  listContent: { paddingHorizontal: SPACING.l, paddingBottom: 100 },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: SPACING.m,
    padding: SPACING.m,
    ...SHADOWS.light
  },
  // Removed itemImage style
  itemInfo: { justifyContent: 'space-between', gap: 5 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  itemCategory: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ratingText: { fontSize: 12, color: COLORS.textLight, marginLeft: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  addButton: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 20 }
});