require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static('public'));

app.get('/kitchen', (req, res) => {
    res.sendFile(__dirname + '/public/kitchen.html');
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/canteeria', {})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
});

const seedData = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@canteeria.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "password123";

        const adminExists = await User.findOne({ email: adminEmail });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const adminUser = new User({
                name: "Admin User",
                email: adminEmail,
                password: hashedPassword,
                role: "admin"
            });
            await adminUser.save();
            console.log(`Seeded Admin User: ${adminEmail}`);
        }

        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            const products = [
                { name: "Veg Burger", price: 50, image: "https://img.freepik.com/free-photo/fresh-tasty-burger_144627-7424.jpg", category: "Fast Food", rating: 4.5 },
                { name: "Masala Dosa", price: 80, image: "https://img.freepik.com/free-photo/delicious-indian-dosa-composition_23-2149086051.jpg", category: "South Indian", rating: 4.8 },
                { name: "Paneer Tikka", price: 120, image: "https://img.freepik.com/free-photo/grilled-paneer-tikka-is-popular-north-indian-starter-served-with-green-chutney-onion-salad-selective-focus_466689-73628.jpg", category: "Starters", rating: 4.6 }
            ];
            await Product.insertMany(products);
            console.log("Seeded initial products");
        }

    } catch (err) {
        console.log("Seeding failed:", err.message);
    }
};
seedData();


app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        res.json({
            success: true,
            token: 'fake-jwt-token-' + user._id,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.json({
            success: true,
            token: 'fake-jwt-token-' + newUser._id,
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ _id: -1 }); // Newest first
        res.json(products.map(p => ({ id: p._id, ...p._doc })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, price, image, category } = req.body;
        const newProduct = new Product({ name, price, image, category });
        await newProduct.save();
        io.emit('menuUpdate'); // Notify clients
        res.json(newProduct);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { items, totalAmount, studentName, userId } = req.body;
        const newOrder = new Order({ items, totalAmount, studentName, userId });
        await newOrder.save();

        for (const item of items) {
            if (item.foodId) {
                await Product.findByIdAndUpdate(item.foodId, { $inc: { sales: item.quantity } });
            }
        }

        io.emit('newOrder', {
            id: newOrder._id,
            total: totalAmount,
            status: 'pending',
            date: newOrder.date,
            studentName
        });

        res.status(201).json({ success: true, orderId: newOrder._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        io.emit('orderStatusUpdated', { id: order._id, status: order.status });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/orders/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: "Invalid User ID" });

        const orders = await Order.find({ userId: userId }).sort({ date: -1 });
        res.json(orders.map(o => ({
            id: o._id,
            items: o.items,
            total: o.totalAmount,
            status: o.status,
            date: o.date
        })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/admin/analytics', async (req, res) => {
    try {
        const totalSalesResult = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalSales = totalSalesResult[0]?.total || 0;
        const totalOrders = await Order.countDocuments();

        const recentOrders = await Order.find().sort({ date: -1 }).populate('items.foodId');

        res.json({
            totalSales,
            totalOrders,
            popularItem: "Veg Burger",
            recentOrders: recentOrders.map(o => ({
                id: o._id,
                total: o.totalAmount,
                status: o.status,
                studentName: o.studentName,
                items: o.items.map(i => ({
                    name: i.name || (i.foodId ? i.foodId.name : 'Unknown Item'),
                    quantity: i.quantity,
                    price: i.price
                })),
                date: o.date
            }))
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} with Socket.IO`);
});
