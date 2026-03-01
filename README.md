# QuickTask PWA

An offline-first Progressive Web App for task management that works seamlessly without internet connectivity.

## Features

### 🚀 Core Features
- **Offline-First**: Create and manage tasks without internet
- **Background Sync**: Automatically syncs tasks when connectivity returns
- **Push Notifications**: Get notified about task updates
- **PWA Support**: Install as a native app on your device
- **Real-time Status**: See which tasks are pending sync

### 🛡️ Offline Capabilities
- Tasks saved locally in IndexedDB immediately
- Pending tasks show "pending" badge until synced
- Background sync handles network operations automatically
- Full functionality without internet connection

### 📱 PWA Features
- Service Worker for offline caching
- Web App Manifest for installation
- Push notifications via Firebase Cloud Messaging
- Background sync for deferred operations

## Tech Stack

- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Workbox** - Service worker generation
- **IndexedDB** - Local data storage
- **Firebase** - Push notifications
- **CSS-in-JS** - Component styling

## Quick Start

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd quicktask-pwa
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## How It Works

### Offline-First Architecture

1. **Task Creation**: When you create a task while offline, it's immediately saved to IndexedDB with `syncStatus: 'pending'`

2. **UI Feedback**: The task shows a "pending" badge indicating it hasn't been synced to the server yet

3. **Background Sync**: The app registers a background sync request that will be processed when internet connectivity returns

4. **Automatic Sync**: When online, the service worker automatically syncs all pending tasks to the server

5. **Status Update**: Once synced, the task status updates to `syncStatus: 'synced'` and the pending badge disappears

### Data Flow

```
User Action → IndexedDB (Local) → UI Update → Background Sync → Server
     ↑              ↓                ↓              ↓            ↓
  Immediate    Persistent      Visual       Deferred     Eventually
   Response     Storage        Feedback     Operation     Consistent
```

### Key Components

- **`useTasks` Hook**: Manages task state and offline logic
- **`TaskItem` Component**: Displays individual tasks with sync status
- **`db.js`**: IndexedDB operations for local storage
- **`sync.js`**: Background sync registration and processing
- **`sw.js`**: Service worker for caching and offline support

## Browser Support

### Required Features
- Service Workers (Chrome 40+, Firefox 44+, Safari 11.1+)
- IndexedDB (Chrome 24+, Firefox 16+, Safari 7+)
- Background Sync (Chrome 49+, Firefox 71+)
- Push API (Chrome 42+, Firefox 44+)

### Progressive Enhancement
- Core functionality works in all modern browsers
- PWA features enhance experience where supported
- Graceful degradation for older browsers

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── TaskItem.jsx     # Task display with sync status
│   ├── TaskInput.jsx    # Task creation form
│   ├── OnlineStatus.jsx # Network connectivity indicator
│   └── NotificationSetup.jsx # Push notification setup
├── hooks/              # Custom React hooks
│   └── useTasks.js     # Task management logic
├── db.js              # IndexedDB operations
├── sync.js            # Background sync logic
├── sw.js              # Service worker implementation
└── App.jsx           # Main application component
```

### Testing Offline Functionality

1. Open Chrome DevTools
2. Go to Application > Service Workers
3. Check "Offline" in the Network tab
4. Create tasks and observe the pending badge
5. Uncheck "Offline" and watch tasks sync automatically

### Service Worker Testing

1. Open Chrome DevTools
2. Go to Application > Service Workers
3. Use "Sync" button to manually trigger background sync
4. Check console for sync logs

## Configuration

### Firebase Setup (Optional)

To enable push notifications:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Add your web app and get the configuration
3. Update `src/firebase.js` with your Firebase config
4. Update `public/firebase-messaging-sw.js` with your VAPID key

### PWA Configuration

The PWA is configured via `public/manifest.json`:

```json
{
  "name": "QuickTask",
  "short_name": "QuickTask",
  "description": "Offline-first task manager",
  "theme_color": "#6366f1",
  "background_color": "#0b1020",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [...]
}
```

## Performance

### Caching Strategy
- **Cache First**: Images and static assets
- **Network First**: Task data (API calls)
- **Stale While Revalidate**: User profile data

### Bundle Optimization
- Code splitting with dynamic imports
- Tree shaking for unused code
- Minification and compression

## Security

### Content Security Policy
Implemented via meta tags to prevent XSS attacks and restrict script sources.

### Data Privacy
- All data stored locally by default
- Server sync is optional
- No data sent without user action

### HTTPS Requirements
- Required for service workers and push notifications
- Local development uses localhost (secure context)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially offline scenarios)
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the [Issues](https://github.com/your-repo/quicktask-pwa/issues) section
- Ensure you're testing in a supported browser
- Verify service worker is registered and active
- Check console for error messages