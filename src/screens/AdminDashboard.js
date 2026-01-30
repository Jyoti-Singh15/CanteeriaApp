import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { LogOut, TrendingUp, Users, ShoppingBag, Plus, X, Check, Clock, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import io from 'socket.io-client';

const API_URL = 'http://10.0.2.2:5000';
const socket = io(API_URL);

const CATEGORIES = ["Breakfast", "Lunch", "Snacks", "Fast Food", "Drinks", "Desserts", "South Indian", "Chinese"];

export default function AdminDashboard({ navigation }) {
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Dropdown State
    const [dropdownVisible, setDropdownVisible] = useState(false);

    // New Item State (Image removed)
    const [newItem, setNewItem] = useState({ name: '', price: '', category: '' });
    const [loading, setLoading] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/analytics`);
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchStats().then(() => setRefreshing(false));
    }, []);

    useEffect(() => {
        fetchStats();

        // Realtime Listeners
        socket.on('newOrder', (order) => {
            Alert.alert("New Order!", `Order received from ${order.studentName || 'Student'}`);
            fetchStats();
        });

        socket.on('orderStatusUpdated', () => {
            fetchStats();
        });

        return () => {
            socket.off('newOrder');
            socket.off('orderStatusUpdated');
        };
    }, []);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userRole');
        navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
        );
    };

    const updateOrderStatus = async (orderId, status) => {
        try {
            await fetch(`${API_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            // Socket will auto-trigger refresh via 'orderStatusUpdated'
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
        }
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.price || !newItem.category) {
            Alert.alert("Error", "All fields are required");
            return;
        }
        setLoading(true);
        try {
            await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            setModalVisible(false);
            setNewItem({ name: '', price: '', category: '' });
            Alert.alert("Success", "Item added to menu");
        } catch (error) {
            Alert.alert("Error", "Failed to add item");
        } finally {
            setLoading(false);
        }
    };

    const selectCategory = (cat) => {
        setNewItem({ ...newItem, category: cat });
        setDropdownVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Plus color={COLORS.primary} size={24} />
                    </TouchableOpacity>
                    <LogOut color={COLORS.primary} size={24} onPress={handleLogout} />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Analytics Cards */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                        <View style={styles.iconContainer}><TrendingUp color="#1976D2" size={24} /></View>
                        <Text style={styles.statLabel}>Total Sales</Text>
                        <Text style={styles.statValue}>₹{stats?.totalSales || 0}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                        <View style={styles.iconContainer}><ShoppingBag color="#388E3C" size={24} /></View>
                        <Text style={styles.statLabel}>Orders</Text>
                        <Text style={styles.statValue}>{String(stats?.totalOrders || 0)}</Text>
                    </View>
                </View>

                {/* Live Orders Section */}
                <Text style={styles.sectionTitle}>Live Orders</Text>
                {stats?.recentOrders?.length === 0 && <Text style={{ color: COLORS.textLight }}>No active orders.</Text>}
                {stats?.recentOrders?.map((order) => (
                    <View key={order.id} style={styles.orderCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.orderId}>Order #{order.id.slice(-6)} <Text style={{ fontWeight: 'normal' }}>• {order.studentName}</Text></Text>
                            <Text style={styles.orderDate}>Items: {order.items?.length || 0} • ₹{order.total}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: order.status === 'completed' ? '#dcfce7' : '#fef9c3' }]}>
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: order.status === 'completed' ? '#166534' : '#854d0e' }}>
                                    {order.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        {order.status === 'pending' && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => updateOrderStatus(order.id, 'completed')}>
                                    <Check size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {order.status === 'completed' && (
                            <Check size={24} color={COLORS.success} />
                        )}
                    </View>
                ))}
            </ScrollView>

            {/* Add Item Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Item</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color={COLORS.text} /></TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Item Name</Text>
                        <TextInput style={styles.input} placeholder="e.g. Veg Burger" value={newItem.name} onChangeText={t => setNewItem({ ...newItem, name: t })} />

                        <Text style={styles.label}>Price (₹)</Text>
                        <TextInput style={styles.input} placeholder="e.g. 50" keyboardType="numeric" value={newItem.price} onChangeText={t => setNewItem({ ...newItem, price: t })} />

                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setDropdownVisible(true)}>
                            <Text style={styles.dropdownText}>{newItem.category || "Select Category"}</Text>
                            <ChevronDown size={20} color={COLORS.textLight} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.addBtn} onPress={handleAddItem} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.addBtnText}>Add Item</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Category Selection Modal */}
            <Modal visible={dropdownVisible} animationType="fade" transparent>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
                    <View style={styles.dropdownModal}>
                        <Text style={styles.dropdownTitle}>Select Category</Text>
                        <FlatList
                            data={CATEGORIES}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => selectCategory(item)}>
                                    <Text style={styles.dropdownItemText}>{item}</Text>
                                    {newItem.category === item && <Check size={16} color={COLORS.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: SPACING.l, backgroundColor: COLORS.card, ...SHADOWS.light,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
    content: { padding: SPACING.l, paddingBottom: 100 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: SPACING.m, marginBottom: SPACING.m },

    statsGrid: { flexDirection: 'row', gap: SPACING.m, marginBottom: SPACING.l },
    statCard: { flex: 1, padding: SPACING.m, borderRadius: 16, ...SHADOWS.card },
    iconContainer: { marginBottom: SPACING.s },
    statLabel: { fontSize: 14, color: COLORS.textLight },
    statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },

    orderCard: {
        backgroundColor: COLORS.card, padding: SPACING.m, borderRadius: 12, marginBottom: SPACING.m,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...SHADOWS.light,
    },
    orderId: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
    orderDate: { fontSize: 14, color: COLORS.textLight, marginTop: 4, marginBottom: 8 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { padding: 10, borderRadius: 25 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACING.l },
    modalContent: { backgroundColor: 'white', borderRadius: 16, padding: SPACING.l },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.l },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: COLORS.border, padding: SPACING.m, borderRadius: 8, marginBottom: SPACING.m },

    dropdownTrigger: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.border, padding: SPACING.m, borderRadius: 8, marginBottom: SPACING.l
    },
    dropdownText: { fontSize: 16, color: COLORS.text },

    dropdownModal: {
        backgroundColor: 'white', margin: SPACING.l, marginTop: '50%', borderRadius: 12, padding: SPACING.m, elevation: 5
    },
    dropdownTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: SPACING.m, textAlign: 'center' },
    dropdownItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
    dropdownItemText: { fontSize: 16 },

    addBtn: { backgroundColor: COLORS.primary, padding: SPACING.m, borderRadius: 8, alignItems: 'center' },
    addBtnText: { color: 'white', fontWeight: 'bold' }
});
