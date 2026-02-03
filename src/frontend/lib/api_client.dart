import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({required this.baseUrl});

  final String baseUrl;

  Future<Map<String, dynamic>> demoLogin() async {
    final response = await http.post(Uri.parse('$baseUrl/v1/auth/demo-login'));
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> listChildren(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/v1/children'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> selectChild(String token, String childId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/v1/children/select'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'child_id': childId}),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> chat(Map<String, dynamic> payload) async {
    final response = await http.post(
      Uri.parse('$baseUrl/v1/chat'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> quests() async {
    final response = await http.get(Uri.parse('$baseUrl/v1/quests'));
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> startQuest(String questId, String childId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/v1/quests/start'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'quest_id': questId, 'child_id': childId}),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> stepQuest(String sessionId, String answer) async {
    final response = await http.post(
      Uri.parse('$baseUrl/v1/quests/step'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'session_id': sessionId, 'answer': answer}),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> completeQuest(String sessionId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/v1/quests/complete'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'session_id': sessionId}),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> world(String childId) async {
    final response = await http.get(Uri.parse('$baseUrl/v1/world?child_id=$childId'));
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> parentSummary(String childId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/v1/parent/summary?child_id=$childId'),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> safetyAudit(String childId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/v1/parent/safety-audit?child_id=$childId'),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sessionList(String childId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/v1/parent/sessions?child_id=$childId&days=7'),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sessionDetail(String childId, String sessionId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/v1/parent/sessions/$sessionId?child_id=$childId'),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> resetDemo(String childId, String pin) async {
    final response = await http.post(
      Uri.parse('$baseUrl/v1/admin/reset-demo'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'child_id': childId, 'pin': pin}),
    );
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}
