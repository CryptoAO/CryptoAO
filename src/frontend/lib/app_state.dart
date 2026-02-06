import 'dart:async';

import 'package:flutter/material.dart';

import 'api_client.dart';

class AppState extends ChangeNotifier {
  AppState({required this.apiClient});

  final ApiClient apiClient;

  String? token;
  Map<String, dynamic>? selectedChild;
  List<dynamic> children = [];
  List<dynamic> quests = [];
  List<dynamic> worldItems = [];
  Map<String, dynamic> parentSummary = {};
  Map<String, dynamic> safetyAudit = {};
  List<dynamic> sessions = [];
  Map<String, dynamic> sessionDetail = {};
  bool offlineMode = false;

  Future<void> loginDemo() async {
    try {
      final response = await apiClient.demoLogin();
      token = response['token'] as String;
      children = response['children'] as List<dynamic>;
      offlineMode = false;
    } catch (_) {
      offlineMode = true;
      token = 'offline-token';
      children = [
        {'id': 'offline_child', 'name': 'Nova', 'grade': '1'}
      ];
    }
    notifyListeners();
  }

  Future<void> selectChild(String childId) async {
    final child = children.firstWhere((c) => c['id'] == childId);
    selectedChild = child as Map<String, dynamic>;
    if (!offlineMode && token != null) {
      await apiClient.selectChild(token!, childId);
    }
    notifyListeners();
  }

  Future<void> loadQuests() async {
    if (offlineMode) {
      quests = _offlineQuests;
      notifyListeners();
      return;
    }
    try {
      final response = await apiClient.quests();
      quests = response['quests'] as List<dynamic>;
    } catch (_) {
      offlineMode = true;
      quests = _offlineQuests;
    }
    notifyListeners();
  }

  Future<void> loadWorld() async {
    if (offlineMode || selectedChild == null) {
      worldItems = [];
      notifyListeners();
      return;
    }
    final response = await apiClient.world(selectedChild!['id'] as String);
    worldItems = response['items'] as List<dynamic>;
    notifyListeners();
  }

  Future<void> loadParentSummary() async {
    if (offlineMode || selectedChild == null) {
      parentSummary = {
        'mastery': {},
        'safety_counts': {},
        'unlocked_items': [],
        'quests_completed': 0,
        'skills_in_progress': 0,
        'recommended_quests': [],
      };
      notifyListeners();
      return;
    }
    final response = await apiClient.parentSummary(selectedChild!['id'] as String);
    parentSummary = response;
    notifyListeners();
  }

  Future<void> loadSafetyAudit() async {
    if (offlineMode || selectedChild == null) {
      safetyAudit = {'events': [], 'lock_active': false, 'lock_remaining_minutes': 0};
      notifyListeners();
      return;
    }
    final response = await apiClient.safetyAudit(selectedChild!['id'] as String);
    safetyAudit = response;
    notifyListeners();
  }

  Future<void> loadSessions() async {
    if (offlineMode || selectedChild == null) {
      sessions = [];
      notifyListeners();
      return;
    }
    final response = await apiClient.sessionList(selectedChild!['id'] as String);
    sessions = response['sessions'] as List<dynamic>;
    notifyListeners();
  }

  Future<void> loadSessionDetail(String sessionId) async {
    if (offlineMode || selectedChild == null) {
      sessionDetail = {};
      notifyListeners();
      return;
    }
    final response = await apiClient.sessionDetail(selectedChild!['id'] as String, sessionId);
    sessionDetail = response;
    notifyListeners();
  }

  Future<bool> resetDemo(String pin) async {
    if (offlineMode || selectedChild == null) return false;
    final response = await apiClient.resetDemo(selectedChild!['id'] as String, pin);
    return response['status'] == 'reset';
  }
}

const List<Map<String, dynamic>> _offlineQuests = [
  {
    'id': 'offline_math',
    'title': 'Offline Number Quest',
    'steps': [
      {
        'prompt': 'You have 1 apple and get 2 more. How many now?',
        'choices': ['2', '3', '4'],
        'answer': '3',
        'hint': 'Count: 1, 2, 3.',
        'explanation': '1 + 2 = 3.'
      }
    ],
    'reflection_question': 'What helped you count today?'
  },
  {
    'id': 'offline_reading',
    'title': 'Offline Letter Quest',
    'steps': [
      {
        'prompt': 'What sound does letter m make in moon?',
        'choices': ['m', 's', 't'],
        'answer': 'm',
        'hint': 'Say mmm-moon.',
        'explanation': 'The sound is /m/.'
      }
    ],
    'reflection_question': 'Which sound was fun to say?'
  }
];
