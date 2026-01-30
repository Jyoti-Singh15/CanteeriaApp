import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogOut, Clock, CheckCircle } from 'lucide-react-native';
import { getUserOrders } from '../lib/api';
import { COLORS, SPACING, SHADOWS } from '../theme';
import io from 'socket.io-client';

const SOCKET_URL = 'http://10.0.2.2:5000';

export default function ProfilePage({ navigation }) {
  const [user, setUser] = useState({ name: '', email: '' });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();

    const socket = io(SOCKET_URL);
    socket.on('connect', () => console.log('Connected to socket server'));

    socket.on('orderStatusUpdated', (updatedOrder) => {
      console.log("Order update received:", updatedOrder);
      setOrders(prevOrders => prevOrders.map(o =>
        (o.id === updatedOrder.id || o._id === updatedOrder.id) ? { ...o, status: updatedOrder.status } : o
      ));
    });

    socket.on('newOrder', async (newOrder) => {
      const myId = await AsyncStorage.getItem('userId');
      if (newOrder.userId === myId) {
        console.log("New order placed, refreshing list...");
        fetchOrders(myId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadUserData = async () => {
    const name = await AsyncStorage.getItem('userName');
    const email = await AsyncStorage.getItem('userEmail');
    const userId = await AsyncStorage.getItem('userId');
    setUser({ name: name || 'User', email: email || '' });

    if (userId) fetchOrders(userId);
  };

  const fetchOrders = async (userId) => {
    setLoading(true);
    try {
      const data = await getUserOrders(userId);
      // Sort: Newest first
      setOrders(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error("Failed to load orders", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const userId = await AsyncStorage.getItem('userId');
    if (userId) fetchOrders(userId);
    else setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userName', 'userId', 'userEmail', 'userRole']);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
  const pastOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status));

  const renderOrder = (item) => (
    <View key={item.id || item._id} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{(item.id || item._id).slice(-6)}</Text>
        <Text style={styles.orderDate}>{new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      <View style={styles.orderBody}>
        <View>
          {item.items.map((food, idx) => (
            <Text key={idx} style={styles.orderItemText}>
              {food.quantity} x {food.name || (food.foodId && food.foodId.name) || 'Item'} (₹{food.price})
            </Text>
          ))}
        </View>
        <Text style={styles.orderTotal}>₹{item.totalAmount || item.total}</Text>
      </View>
      <View style={styles.orderFooter}>
        <View style={styles.statusBadge(item.status)}>
          {item.status === 'completed' ? <CheckCircle size={14} color={COLORS.white} /> : <Clock size={14} color={COLORS.white} />}
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>Active Orders ⏳</Text>
            {activeOrders.map(renderOrder)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order History 📜</Text>
          {orders.length === 0 && !loading ? (
            <Text style={styles.emptyText}>No orders yet. Hungry?</Text>
          ) : pastOrders.length === 0 && activeOrders.length === 0 ? (
            <Text style={styles.emptyText}>No past orders.</Text>
          ) : (
            pastOrders.length > 0 ? pastOrders.map(renderOrder) : <Text style={styles.emptyText}>No history yet.</Text>
          )}
        </View>

        {loading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color={COLORS.white} size={20} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems: 'center', paddingTop: 60, paddingBottom: 30,
    backgroundColor: COLORS.white, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    ...SHADOWS.medium, marginBottom: 20
  },
  name: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  email: { fontSize: 16, color: COLORS.textLight, marginTop: 4 },

  content: { padding: SPACING.l },
  section: { marginBottom: SPACING.l },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.m },
  emptyText: { textAlign: 'center', color: COLORS.textLight, marginTop: 10, fontSize: 16 },

  orderCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: SPACING.m, marginBottom: SPACING.m,
    ...SHADOWS.light
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.s },
  orderId: { fontWeight: 'bold', color: COLORS.text },
  orderDate: { color: COLORS.textLight, fontSize: 12 },
  orderBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.m },
  orderItemText: { color: COLORS.textLight, fontSize: 14 },
  orderTotal: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },

  orderFooter: { flexDirection: 'row' },
  statusBadge: (status) => ({
    flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20,
    backgroundColor:
      status === 'completed' ? COLORS.success :
        status === 'ready' ? COLORS.secondary :
          status === 'preparing' ? '#FFC107' : // Amber for preparing
            COLORS.textLight // Gray for pending/other
  }),
  statusText: { color: COLORS.white, fontWeight: 'bold', fontSize: 10, marginLeft: 4 },

  logoutButton: {
    position: 'absolute', bottom: 30, right: 30, left: 30,
    backgroundColor: COLORS.primary, padding: 15, borderRadius: 30,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    ...SHADOWS.medium
  },
  logoutText: { color: COLORS.white, fontWeight: 'bold', marginLeft: 10, fontSize: 16 }
});