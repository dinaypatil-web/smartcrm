const express = require('express');
const { NotificationRepository } = require('../repositories');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/notifications
router.get('/', auth, async (req, res) => {
    try {
        const { type, isRead, page = 1, limit = 20 } = req.query;
        let notifications = await NotificationRepository.findAll();

        if (type) {
            notifications = notifications.filter(n => n.type === type);
        }
        if (isRead !== undefined) {
            notifications = notifications.filter(n => n.isRead === (isRead === 'true'));
        }

        // Result of findAll() might contain Firestore Timestamps
        notifications.sort((a, b) => {
            const dateA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
            const dateB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
            return dateB - dateA;
        });

        const total = notifications.length;
        const unreadCount = notifications.filter(n => !n.isRead).length;
        const paged = notifications.slice((page - 1) * limit, page * limit);

        res.json({ notifications: paged, total, unreadCount, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/notifications/test
router.post('/test', auth, async (req, res) => {
    try {
        const notification = await NotificationRepository.create({
            type: 'SYSTEM',
            title: 'Test Notification',
            message: 'This is a test notification generated at ' + new Date().toLocaleTimeString(),
            severity: 'info',
            isRead: false,
            createdAt: new Date()
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await NotificationRepository.findById(req.params.id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        const readBy = notification.readBy || [];
        readBy.push({ user: req.user.id, readAt: new Date() });

        const updated = await NotificationRepository.update(req.params.id, {
            isRead: true,
            readBy
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notifications/read-all
router.put('/read-all', auth, async (req, res) => {
    try {
        const notifications = await NotificationRepository.findAll();
        const unread = notifications.filter(n => !n.isRead);

        for (const n of unread) {
            await NotificationRepository.update(n.id, { isRead: true });
        }

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
