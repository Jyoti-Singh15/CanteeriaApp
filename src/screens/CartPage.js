import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, ShoppingBag } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../context/CartContext';
import { createOrder } from '../lib/api';
import { COLORS, SPACING, SHADOWS } from '../theme';

export default function CartPage({ navigation }) {
  const { cart, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    try {
      const studentName = await AsyncStorage.getItem('userName') || "Student";
      const userId = await AsyncStorage.getItem('userId');

      const orderData = {
        items: cart.map(item => ({
          name: item.name,
          foodId: item.id || item._id,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: total,
        studentName: studentName,
        userId: userId
      };

      await createOrder(orderData);

      Alert.alert("Success", "Order placed successfully!");
      clearCart();
      navigation.navigate('Home');
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to place order. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Your Cart</Text>

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <ShoppingBag size={48} color={COLORS.textLight} />
          </View>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Menu')}>
            <Text style={styles.browseButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetails}>Qty: {item.quantity} x ₹{item.price}</Text>
                </View>
                <TouchableOpacity onPress={() => removeFromCart(item.id || item._id)}>
                  <Trash2 color={COLORS.error} size={20} />
                </TouchableOpacity>
              </View>
            )}
          />
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₹{total}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, loading && styles.disabledBtn]}
              onPress={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.checkoutText}>Place Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, padding: SPACING.l },
  listContent: { paddingHorizontal: SPACING.l },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.l },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.m, ...SHADOWS.light },
  emptyText: { marginBottom: SPACING.l, color: COLORS.textLight, fontSize: 18 },
  browseButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25 },
  browseButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

  cartItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.white, padding: SPACING.m, borderRadius: 12, marginBottom: SPACING.m,
    ...SHADOWS.light
  },
  itemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  itemDetails: { color: COLORS.textLight, marginTop: 4 },

  footer: {
    backgroundColor: COLORS.white, padding: SPACING.l, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    ...SHADOWS.medium
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.m },
  totalLabel: { fontSize: 18, color: COLORS.text },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  checkoutButton: { backgroundColor: COLORS.primary, padding: SPACING.m, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { opacity: 0.7 },
  checkoutText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 }
});