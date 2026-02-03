import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api_client.dart';
import 'app_state.dart';

void main() {
  runApp(const SafeLearnApp());
}

class SafeLearnApp extends StatelessWidget {
  const SafeLearnApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(apiClient: ApiClient(baseUrl: 'http://127.0.0.1:8000')),
      child: MaterialApp(
        title: 'SAFELEARN',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.purple),
          textTheme: const TextTheme(bodyMedium: TextStyle(fontSize: 18)),
        ),
        home: const DemoLoginScreen(),
      ),
    );
  }
}

class DemoLoginScreen extends StatelessWidget {
  const DemoLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(title: const Text('SAFELEARN Demo Login')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Tap to load the demo parent and child profiles.'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                await context.read<AppState>().loginDemo();
              },
              child: const Text('Load Demo Profiles'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const DemoTourScreen()),
                );
              },
              child: const Text('Demo Tour'),
            ),
            const SizedBox(height: 16),
            if (appState.children.isNotEmpty)
              Expanded(
                child: ListView.builder(
                  itemCount: appState.children.length,
                  itemBuilder: (context, index) {
                    final child = appState.children[index] as Map<String, dynamic>;
                    return Card(
                      child: ListTile(
                        title: Text(child['name'] as String),
                        subtitle: Text('Grade ${child['grade']}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () async {
                          await context.read<AppState>().selectChild(child['id'] as String);
                          if (!context.mounted) return;
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const KidHomeScreen()),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            if (appState.offlineMode)
              const Text('Offline Adventure mode active.', style: TextStyle(color: Colors.orange)),
          ],
        ),
      ),
    );
  }
}

class KidHomeScreen extends StatelessWidget {
  const KidHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final child = context.read<AppState>().selectedChild;
    return Scaffold(
      appBar: AppBar(title: Text('Kid Home - ${child?['name'] ?? ''}')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text('Welcome to the Magic Haven!'),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const KidChatScreen()),
                  );
                },
                icon: const Icon(Icons.chat_bubble_outline),
                label: const Text('Chat with Spark'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const QuestRunnerScreen()),
                  );
                },
                icon: const Icon(Icons.auto_awesome),
                label: const Text('Start a Quest'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const LearningWorldScreen()),
                  );
                },
                icon: const Icon(Icons.castle),
                label: const Text('View Learning World'),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ParentDashboardScreen()),
                  );
                },
                icon: const Icon(Icons.lock),
                label: const Text('Parent Dashboard'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class KidChatScreen extends StatefulWidget {
  const KidChatScreen({super.key});

  @override
  State<KidChatScreen> createState() => _KidChatScreenState();
}

class _KidChatScreenState extends State<KidChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isThinking = false;

  Future<void> _send(BuildContext context, String text) async {
    final appState = context.read<AppState>();
    if (appState.selectedChild == null) return;
    setState(() {
      _isThinking = true;
      _messages.add({'from': 'kid', 'text': text});
    });
    final payload = {
      'child_id': appState.selectedChild!['id'],
      'message': text,
      'mode': 'text',
      'locale': 'en-US',
    };
    Map<String, dynamic> response;
    try {
      response = await appState.apiClient.chat(payload);
    } catch (_) {
      response = {
        'reply': 'Offline mode: Try a math quest or a reading quest?',
        'choices': ['Math quest', 'Reading quest'],
      };
    }
    setState(() {
      _messages.add({'from': 'spark', 'text': response['reply'], 'choices': response['choices']});
      _isThinking = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final quickPrompts = [
      'Help me with math',
      'Read with me',
      'Teach me a fun fact',
      'Start a Brain Battle',
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Chat with Spark')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              spacing: 8,
              children: quickPrompts
                  .map(
                    (prompt) => ActionChip(
                      label: Text(prompt),
                      onPressed: () => _send(context, prompt),
                    ),
                  )
                  .toList(),
            ),
          ),
          if (_isThinking)
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Text('Spark is thinking…'),
            ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                final isKid = message['from'] == 'kid';
                return Align(
                  alignment: isKid ? Alignment.centerRight : Alignment.centerLeft,
                  child: Card(
                    color: isKid ? Colors.purple.shade50 : Colors.white,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(message['text'] as String),
                          if (message['choices'] != null) ...[
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              children: (message['choices'] as List<dynamic>).map((choice) {
                                return ActionChip(
                                  label: Text(choice.toString()),
                                  onPressed: () => _send(context, choice.toString()),
                                );
                              }).toList(),
                            )
                          ]
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(hintText: 'Ask Spark a question'),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: () {
                    final text = _controller.text;
                    if (text.isEmpty) return;
                    _controller.clear();
                    _send(context, text);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class QuestRunnerScreen extends StatefulWidget {
  const QuestRunnerScreen({super.key});

  @override
  State<QuestRunnerScreen> createState() => _QuestRunnerScreenState();
}

class _QuestRunnerScreenState extends State<QuestRunnerScreen> {
  String? _sessionId;
  String _prompt = '';
  List<dynamic> _choices = [];
  String? _hint;
  String? _explanation;
  bool _completeReady = false;
  String? _rewardName;
  int _currentStep = 0;
  int _totalSteps = 1;
  String _feedback = '';

  @override
  void initState() {
    super.initState();
    context.read<AppState>().loadQuests();
  }

  Future<void> _startQuest(Map<String, dynamic> quest) async {
    final appState = context.read<AppState>();
    final steps = (quest['steps'] as List<dynamic>?) ?? [];
    _totalSteps = steps.isEmpty ? 1 : steps.length;
    if (appState.offlineMode) {
      final step = (quest['steps'] as List<dynamic>)[0] as Map<String, dynamic>;
      setState(() {
        _sessionId = quest['id'] as String;
        _prompt = step['prompt'] as String;
        _choices = step['choices'] as List<dynamic>;
        _currentStep = 1;
        _feedback = '';
      });
      return;
    }
    final response = await appState.apiClient.startQuest(
      quest['id'] as String,
      appState.selectedChild!['id'] as String,
    );
    setState(() {
      _sessionId = response['session_id'] as String;
      _prompt = response['prompt'] as String;
      _choices = response['choices'] as List<dynamic>;
      _totalSteps = (response['total_steps'] as int?) ?? _totalSteps;
      _hint = null;
      _explanation = null;
      _completeReady = false;
      _currentStep = 1;
      _feedback = '';
    });
  }

  Future<void> _stepQuest(String answer) async {
    final appState = context.read<AppState>();
    if (_sessionId == null) return;
    if (appState.offlineMode) {
      setState(() {
        _completeReady = true;
        _feedback = 'Great job!';
      });
      return;
    }
    final response = await appState.apiClient.stepQuest(_sessionId!, answer);
    setState(() {
      _prompt = response['prompt'] as String;
      _choices = response['choices'] as List<dynamic>;
      _hint = response['hint'] as String?;
      _explanation = response['explanation'] as String?;
      _completeReady = response['status'] == 'complete_ready';
      _feedback = response['status'] == 'correct' ? 'Nice work!' : 'Try again!';
      if (response['status'] == 'correct') {
        _currentStep = (_currentStep + 1).clamp(1, _totalSteps);
      }
    });
  }

  Future<void> _completeQuest() async {
    final appState = context.read<AppState>();
    if (_sessionId == null || appState.offlineMode) return;
    final response = await appState.apiClient.completeQuest(_sessionId!);
    final reward = response['reward_item'] as Map<String, dynamic>?;
    setState(() {
      _rewardName = reward?['name'] as String?;
    });
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('World Unlock!'),
        content: Text(_rewardName != null ? 'Unlocked: $_rewardName!' : 'Quest complete!'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Yay!')),
        ],
      ),
    );
    await appState.loadWorld();
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final progress = _totalSteps == 0 ? 0.0 : _currentStep / _totalSteps;
    return Scaffold(
      appBar: AppBar(title: const Text('Quest Runner')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Pick a quest:'),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                children: appState.quests.map((quest) {
                  final questMap = quest as Map<String, dynamic>;
                  return Card(
                    child: ListTile(
                      title: Text(questMap['title'] as String),
                      subtitle: Text('Quest ID: ${questMap['id']}'),
                      onTap: () => _startQuest(questMap),
                    ),
                  );
                }).toList(),
              ),
            ),
            if (_prompt.isNotEmpty) ...[
              const Divider(),
              LinearProgressIndicator(value: progress),
              const SizedBox(height: 8),
              Text(_prompt, style: const TextStyle(fontWeight: FontWeight.bold)),
              if (_feedback.isNotEmpty) Text(_feedback, style: const TextStyle(color: Colors.green)),
              if (_hint != null) Text('Hint: $_hint'),
              if (_explanation != null) Text('Explanation: $_explanation'),
              Wrap(
                spacing: 8,
                children: _choices.map((choice) {
                  return ElevatedButton(
                    onPressed: () => _stepQuest(choice.toString()),
                    child: Text(choice.toString()),
                  );
                }).toList(),
              ),
              if (_completeReady)
                ElevatedButton(
                  onPressed: _completeQuest,
                  child: const Text('Complete Quest'),
                ),
            ]
          ],
        ),
      ),
    );
  }
}

class LearningWorldScreen extends StatefulWidget {
  const LearningWorldScreen({super.key});

  @override
  State<LearningWorldScreen> createState() => _LearningWorldScreenState();
}

class _LearningWorldScreenState extends State<LearningWorldScreen> {
  @override
  void initState() {
    super.initState();
    context.read<AppState>().loadWorld();
    context.read<AppState>().loadQuests();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Learning World')),
      body: Consumer<AppState>(
        builder: (context, appState, _) {
          final items = appState.worldItems;
          if (items.isEmpty) {
            return const Center(child: Text('No items yet. Complete a quest!'));
          }
          return GridView.count(
            crossAxisCount: 2,
            children: items.map((item) {
              final itemMap = item as Map<String, dynamic>;
              final unlocked = itemMap['unlocked'] == true;
              return GestureDetector(
                onTap: unlocked
                    ? () => _showItemDetails(context, appState, itemMap)
                    : null,
                child: Card(
                  color: unlocked ? Colors.white : Colors.grey.shade200,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(unlocked ? Icons.star : Icons.lock),
                        const SizedBox(height: 8),
                        Text(itemMap['name'] as String),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }

  void _showItemDetails(BuildContext context, AppState appState, Map<String, dynamic> item) {
    final skillId = item['skill_id'] as String;
    final quest = appState.quests.cast<Map<String, dynamic>>().firstWhere(
          (q) => (q['skill_ids'] as List<dynamic>?)?.contains(skillId) ?? false,
          orElse: () => {},
        );
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('Skill: $skillId'),
            const SizedBox(height: 12),
            if (quest.isNotEmpty)
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const QuestRunnerScreen()),
                  );
                },
                child: const Text('Practice again'),
              ),
          ],
        ),
      ),
    );
  }
}

class ParentDashboardScreen extends StatefulWidget {
  const ParentDashboardScreen({super.key});

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  final TextEditingController _pinController = TextEditingController();
  bool _unlocked = false;

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(title: const Text('Parent Dashboard')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: !_unlocked
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Enter PIN to unlock (demo PIN is 1234).'),
                  TextField(controller: _pinController, obscureText: true),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () async {
                      if (_pinController.text == '1234') {
                        setState(() {
                          _unlocked = true;
                        });
                        await context.read<AppState>().loadParentSummary();
                        await context.read<AppState>().loadSafetyAudit();
                        await context.read<AppState>().loadSessions();
                      }
                    },
                    child: const Text('Unlock'),
                  )
                ],
              )
            : SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Progress Snapshot', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('Mastered skills: ${_masteredCount(appState.parentSummary['mastery'])}'),
                    Text('Skills in progress: ${appState.parentSummary['skills_in_progress']}'),
                    Text('Quests completed: ${appState.parentSummary['quests_completed']}'),
                    Text('Mastery detail: ${appState.parentSummary['mastery']}'),
                    const SizedBox(height: 12),
                    const Text('Safety Summary', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('Safety Counts: ${appState.parentSummary['safety_counts']}'),
                    const SizedBox(height: 12),
                    const Text('Recommended Next Quests', style: TextStyle(fontWeight: FontWeight.bold)),
                    ...((appState.parentSummary['recommended_quests'] as List<dynamic>?) ?? [])
                        .map((quest) => Text('- ${(quest as Map<String, dynamic>)['title']}')),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const SafetyAuditScreen()),
                        );
                      },
                      child: const Text('View Safety Audit'),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const SessionsScreen()),
                        );
                      },
                      child: const Text('View Session Summaries'),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const FounderDemoScriptScreen()),
                        );
                      },
                      child: const Text('Founder Demo Script'),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () async {
                        final success = await appState.resetDemo(_pinController.text);
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(success ? 'Demo reset.' : 'Reset failed.')),
                        );
                      },
                      child: const Text('Reset Demo'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class SafetyAuditScreen extends StatelessWidget {
  const SafetyAuditScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final audit = context.watch<AppState>().safetyAudit;
    final events = (audit['events'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    return Scaffold(
      appBar: AppBar(title: const Text('Safety Audit')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Lock active: ${audit['lock_active']}'),
            Text('Lock remaining: ${audit['lock_remaining_minutes']} min'),
            const SizedBox(height: 12),
            const Text('Recent Events', style: TextStyle(fontWeight: FontWeight.bold)),
            Expanded(
              child: ListView.builder(
                itemCount: events.length,
                itemBuilder: (context, index) {
                  final event = events[index];
                  return ListTile(
                    title: Text(event['category'] as String),
                    subtitle: Text(event['timestamp'] as String),
                  );
                },
              ),
            )
          ],
        ),
      ),
    );
  }
}

class SessionsScreen extends StatelessWidget {
  const SessionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final sessions = context.watch<AppState>().sessions;
    return Scaffold(
      appBar: AppBar(title: const Text('Session Summaries')),
      body: ListView.builder(
        itemCount: sessions.length,
        itemBuilder: (context, index) {
          final session = sessions[index] as Map<String, dynamic>;
          return ListTile(
            title: Text('Session ${session['session_id']}'),
            subtitle: Text(session['date'] as String),
            onTap: () async {
              await context.read<AppState>().loadSessionDetail(session['session_id'] as String);
              if (!context.mounted) return;
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SessionDetailScreen()),
              );
            },
          );
        },
      ),
    );
  }
}

class SessionDetailScreen extends StatelessWidget {
  const SessionDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final detail = context.watch<AppState>().sessionDetail;
    return Scaffold(
      appBar: AppBar(title: const Text('Session Detail')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Skills practiced: ${detail['skills_practiced']}'),
            Text('Quests completed: ${detail['quests_completed']}'),
            Text('Mastery before: ${detail['mastery_before']}'),
            Text('Mastery after: ${detail['mastery_after']}'),
            Text('Highlights: ${detail['spark_highlights']}'),
            Text('Time spent: ${detail['time_spent_minutes']} minutes'),
          ],
        ),
      ),
    );
  }
}

class DemoTourScreen extends StatelessWidget {
  const DemoTourScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Demo Tour')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('Quick Demo Steps:', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text('1) Open Kid Chat and ask a math question.'),
            Text('2) Start the Math Quest and finish it.'),
            Text('3) View Learning World to see the unlock.'),
            Text('4) Open Parent Dashboard to see mastery + safety.'),
          ],
        ),
      ),
    );
  }
}

class FounderDemoScriptScreen extends StatelessWidget {
  const FounderDemoScriptScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Founder Demo Script')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: const [
            Text('3–5 minute demo flow:', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text('1) Demo Login → Select Child'),
            Text('2) Kid Chat → Quick Prompt → Socratic hint'),
            Text('3) Quest Runner → Complete Quest → World Unlock'),
            Text('4) Learning World → Tap unlocked item'),
            Text('5) Parent Dashboard → Safety Audit → Sessions Summary → Reset Demo'),
            SizedBox(height: 12),
            Text('Talking points: Walled Garden, safety layers, Socratic learning, intrinsic rewards, and evidence without transcripts.'),
          ],
        ),
      ),
    );
  }
}

int _masteredCount(dynamic mastery) {
  if (mastery is Map) {
    return mastery.values.where((value) => value == 5).length;
  }
  return 0;
}
