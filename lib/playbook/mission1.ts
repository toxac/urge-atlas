// lib/playbook/mission1.ts
import { MissionSchema } from '../../types/playbook';

const mission1: MissionSchema = {
  id: "mission-1",
  title: "Beg. Borrow. Steel.",
  content: null,
  content_path: "content/missions/mission1/mission.md",
  sequence: 1,
  video_url: "https://evkkxeuiszjpzjpcmkwe.supabase.co/storage/v1/object/public/mission_videos/test.webm",
  big_question: "Am I ready to start?",
  estimated_time_in_days: 14,
  context: ["user_profile"],
  success_message: "You've completed Mission 1: Beg. Borrow. Steel. You defined your 'why,' made a real commitment, mapped your hidden resources, built your support squad, and faced rejection head-on. You're ready for Mission 2.",
  badge_config: {
    key: "badge_mission_1",
    title: "Resourceful Founder",
    description: "Completed Mission 1: Beg. Borrow. Steel. Mastered asking, faced rejection, and mapped your initial founder assets.",
    unlocked_identity: "Resilient Action-Taker",
    icon_key: "ShieldCheck"
  },

  quests: [
    // ============================================
    // QUEST 1: The New Beginning (Demo Scope)
    // ============================================
    {
      id: "mission1_quest1",
      mission_id: "mission-1",
      title: "The New Beginning",
      content_path: "content/missions/mission1/quests/q1.md",
      video_url: "https://evkkxeuiszjpzjpcmkwe.supabase.co/storage/v1/object/public/mission_videos/test.webm",
      sequence: 1,
      estimated_in_app_minutes: 30,
      estimated_off_app_minutes: 60,
      content: null,
      context: ["user_profile"],
      badge_config: {
        key: "badge_quest_1_1",
        title: "Pathfinder",
        description: "Completed Quest 1: Defined your core why, made a real commitment, and faced your initial fears.",
        unlocked_identity: "Self-Aware Founder",
        icon_key: "Compass"
      },
      notes: [
        {
          title: "Honesty is your compass",
          type: "guide",
          content: "Resist the urge to edit yourself. These answers are for you, not a potential investor. The strongest businesses are built on personal truth.",
          related_url: null
        },
        {
          title: "This might feel uncomfortable",
          type: "nudge",
          content: "That's the point. Comfort is where dreams go to die. You're here to build something real.",
          related_url: null
        }
      ],
      success_message: "You've completed Quest 1: The New Beginning. You know your 'why,' you've made a commitment, and you've faced your fears. That's more than most people ever do. On to the next quest.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      tasks: [
        // Task 1.1: Why Start?
        {
          id: "mission1_quest1_task1",
          title: "Why Start?",
          sequence: 1,
          execution_type: "standard-form",
          estimated_minutes: 15,
          briefing_text: "Let's be totally honest. Building a business takes serious energy, and vague goals fade the moment life gets busy. What is the actual change you want to make in your life?",
          mission_id: "mission-1",
          quest_id: "mission1_quest1",
          execution_environment: null,
          checkback_delay_days: null,
          recurring: false,
          interval: null,
          resources: [
            {
              type: "insights",
              isInternal: true,
              isRequired: false,
              url_link: "/resources/insights/why-start-matters",
              title: "Why Your 'Why' Matters More Than Your Idea"
            },
            {
              type: "guide",
              isInternal: true,
              isRequired: false,
              url_link: "/resources/guides/finding-your-north-star",
              title: "Finding Your North Star"
            },
            {
              type: "youtube",
              isInternal: false,
              isRequired: false,
              url_link: "https://www.youtube.com/watch?v=example",
              title: "Simon Sinek: Start With Why"
            }
          ],
          component_key: "MotivationForm",
          reflection_prompt: "Look at your 'why_statement.' Does it resonate with you on a gut level? If not, tweak it now. This will be your anchor.",
          observation_context: null,
          grant_points: 25,
          challenges: [
            {
              title: "The 5-Minute Timer",
              description: "Set a timer for 5 minutes. Write non-stop about why you're starting. Don't edit. Don't judge. Just write.",
              link: "/resources/challenges/the-5-minute-timer"
            }
          ],
          ai_config: null,
          dependencies: [],
          target_count: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },

        // Task 1.2: Commit to the Journey
        {
          id: "mission1_quest1_task2",
          title: "Make It Real",
          sequence: 2,
          execution_type: "standard-form",
          estimated_minutes: 10,
          briefing_text: "Big goals require clear constraints. Let's set realistic expectations for your time, money, and launch timeline. Be honest, not aspirational.",
          mission_id: "mission-1",
          quest_id: "mission1_quest1",
          execution_environment: null,
          checkback_delay_days: null,
          recurring: false,
          interval: null,
          resources: [
            {
              type: "insights",
              isInternal: true,
              isRequired: false,
              url_link: "/resources/insights/the-power-of-constraints",
              title: "The Power of Constraints"
            },
            {
              type: "tools",
              isInternal: true,
              isRequired: false,
              url_link: "/resources/tools/time-audit-template",
              title: "Time Audit Template"
            }
          ],
          component_key: "CommitmentForm",
          reflection_prompt: "Look at your weekly hours. Is this a realistic, sustainable commitment for the next few months? If you can only do 2 hours a day, own that and build your plan around it.",
          observation_context: null,
          grant_points: 25,
          challenges: null,
          ai_config: null,
          dependencies: [],
          target_count: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },

        // Task 1.3: Roadblocks
        {
          id: "mission1_quest1_task3",
          title: "What's Scaring You?",
          sequence: 3,
          execution_type: "standard-form",
          estimated_minutes: 15,
          briefing_text: "Acknowledging your fears is a sign of strength, not weakness. Let's get them out in the open. This helps the program tailor its support for you.",
          mission_id: "mission-1",
          quest_id: "mission1_quest1",
          execution_environment: null,
          checkback_delay_days: null,
          recurring: false,
          interval: null,
          resources: [
            {
              type: "insights",
              isInternal: true,
              isRequired: false,
              url_link: "/resources/insights/fear-is-data",
              title: "Fear is Data"
            },
            {
              type: "guide",
              isInternal: true,
              isRequired: false,
              url_link: "/resources/guides/overcoming-analysis-paralysis",
              title: "Overcoming Analysis Paralysis"
            }
          ],
          component_key: "RoadblockForm",
          reflection_prompt: "What's the scariest roadblock on this list? We can help you with that. Let's make a plan.",
          observation_context: null,
          grant_points: 25,
          challenges: null,
          ai_config: null,
          dependencies: [],
          target_count: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export default mission1;