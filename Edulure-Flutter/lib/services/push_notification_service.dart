import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Handles Firebase Cloud Messaging push notification configuration for the app.
class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  bool _foregroundListenersRegistered = false;
  bool _localNotificationsInitialised = false;

  /// Initialises Firebase, notification permissions, and listeners.
  Future<void> initialize() async {
    await _initialiseFirebase();
    await _configureLocalNotifications();
    await _requestPermissions();
    await _attachListeners();
    await _logFcmToken();
  }

  Future<void> _initialiseFirebase() async {
    try {
      await Firebase.initializeApp();
    } catch (error) {
      debugPrint('Firebase initialisation skipped: $error');
    }
  }

  Future<void> _configureLocalNotifications() async {
    if (_localNotificationsInitialised) {
      return;
    }

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotificationsPlugin.initialize(
      settings,
      onDidReceiveNotificationResponse: _onNotificationInteraction,
    );

    _localNotificationsInitialised = true;
  }

  Future<void> _requestPermissions() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('Push notification permission denied by user.');
    } else if (settings.authorizationStatus == AuthorizationStatus.notDetermined) {
      debugPrint('Push notification permission is not determined yet.');
    }
  }

  Future<void> _attachListeners() async {
    if (_foregroundListenersRegistered) {
      return;
    }

    FirebaseMessaging.onMessage.listen(_showForegroundNotification);
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageInteraction);
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    _foregroundListenersRegistered = true;
  }

  Future<void> _logFcmToken() async {
    try {
      final token = await _messaging.getToken();
      if (kDebugMode) {
        debugPrint('FCM registration token: $token');
      }
    } catch (error) {
      debugPrint('Unable to fetch FCM token: $error');
    }
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    await _showNotification(message);
  }

  Future<void> _handleMessageInteraction(RemoteMessage message) async {
    debugPrint('Notification opened with data: ${message.data}');
  }

  void _onNotificationInteraction(NotificationResponse response) {
    debugPrint('Local notification tapped: ${response.payload}');
  }

  Future<void> _showNotification(RemoteMessage message) async {
    if (!_localNotificationsInitialised) {
      await _configureLocalNotifications();
    }

    final notification = message.notification;
    if (notification == null) {
      return;
    }

    const androidDetails = AndroidNotificationDetails(
      'edulure_push',
      'Edulure Notifications',
      channelDescription: 'Push notifications for Edulure learners.',
      importance: Importance.max,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _localNotificationsPlugin.show(
      notification.hashCode,
      notification.title,
      notification.body,
      details,
      payload: message.data.isNotEmpty ? message.data.toString() : null,
    );
  }

  /// Handles notifications received while the app is in the background.
  Future<void> handleBackgroundMessage(RemoteMessage message) async {
    await _configureLocalNotifications();
    await _showNotification(message);
  }
}

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (error) {
    debugPrint('Firebase background init skipped: $error');
  }
  await PushNotificationService.instance.handleBackgroundMessage(message);
}
