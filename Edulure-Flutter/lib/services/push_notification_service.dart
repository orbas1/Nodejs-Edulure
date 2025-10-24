import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'notification_preference_service.dart';

/// Handles Firebase Cloud Messaging push notification configuration for the app.
class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  bool _foregroundListenersRegistered = false;
  bool _localNotificationsInitialised = false;
  StreamSubscription<String>? _tokenRefreshSubscription;
  Future<void>? _tokenRegistration;
  String? _lastRegisteredToken;

  /// Initialises Firebase, notification permissions, and listeners.
  Future<void> initialize() async {
    await _initialiseFirebase();
    await _configureLocalNotifications();
    await _requestPermissions();
    await _attachListeners();
    await NotificationPreferenceService.instance.loadPreferences();
    await _logFcmToken();
    _tokenRefreshSubscription ??=
        _messaging.onTokenRefresh.listen(_handleTokenRefresh);
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
      if (token != null) {
        await _registerToken(token);
      }
    } catch (error, stackTrace) {
      debugPrint('Unable to fetch FCM token: $error');
      debugPrint('$stackTrace');
    }
  }

  Future<void> _registerToken(String token) {
    if (token.isEmpty) {
      return Future.value();
    }
    if (_lastRegisteredToken == token && _tokenRegistration == null) {
      return Future.value();
    }

    if (_tokenRegistration != null) {
      return _tokenRegistration!;
    }

    final completer = Completer<void>();
    _tokenRegistration = completer.future;

    () async {
      try {
        if (kDebugMode) {
          debugPrint('Registering FCM token: $token');
        }
        await NotificationPreferenceService.instance
            .registerDeviceToken(token, platform: defaultTargetPlatform.name);
        _lastRegisteredToken = token;
        completer.complete();
      } catch (error, stackTrace) {
        debugPrint('Failed to register device token: $error');
        debugPrint('$stackTrace');
        completer.completeError(error, stackTrace);
      } finally {
        _tokenRegistration = null;
      }
    }();

    return _tokenRegistration!;
  }

  Future<void> _handleTokenRefresh(String token) async {
    await _registerToken(token);
  }

  Future<void> refreshFcmToken() async {
    final token = await _messaging.getToken();
    if (token != null) {
      await _registerToken(token);
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

    final preferences =
        NotificationPreferenceService.instance.cachedPreferences;
    final category = message.data['category']?.toString();
    if (preferences != null &&
        !preferences.allowsChannel('push', category: category)) {
      if (kDebugMode) {
        debugPrint(
          'Dropping push notification for category=$category due to preferences',
        );
      }
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

  Future<void> dispose() async {
    await _tokenRefreshSubscription?.cancel();
    _tokenRefreshSubscription = null;
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
