self.addEventListener('push', (event) => {
  let data = { title: 'Padel Matcher', body: 'Nieuwe update!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Padel Matcher', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png?v=2', // Use logo.png instead of default react logo
    badge: '/logo.png?v=2',
    vibrate: [100, 50, 100],
    data: {
      linkId: data.linkId,
      type: data.type
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
