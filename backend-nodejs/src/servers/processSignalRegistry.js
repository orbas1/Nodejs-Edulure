export function createProcessSignalRegistry() {
  const subscriptions = new Set();

  return {
    add(event, handler, { once = false } = {}) {
      const subscription = { event, handler };
      subscriptions.add(subscription);

      if (once) {
        process.once(event, handler);
      } else {
        process.on(event, handler);
      }

      return subscription;
    },
    cleanup() {
      for (const subscription of subscriptions) {
        process.off(subscription.event, subscription.handler);
      }
      subscriptions.clear();
    }
  };
}
