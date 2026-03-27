export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendNotification = (title, body, icon = '/logo192.png') => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon,
      silent: false
    });
  }
};
