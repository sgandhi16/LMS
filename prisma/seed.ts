import { PrismaClient, Role, QuestionType, VideoProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Sports LMS database...");

  // ─── Clean Slate ───────────────────────────────────────────────
  await prisma.$transaction([
    prisma.attemptAnswer.deleteMany(),
    prisma.attempt.deleteMany(),
    prisma.moduleProgress.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.acceptedAnswer.deleteMany(),
    prisma.option.deleteMany(),
    prisma.question.deleteMany(),
    prisma.test.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.video.deleteMany(),
    prisma.module.deleteMany(),
    prisma.sport.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ─── Users ─────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123!", 12);
  const studentPassword = await bcrypt.hash("Student@123!", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@school.test",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const [alice, bob, charlie] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice Johnson",
        email: "alice@school.test",
        passwordHash: studentPassword,
        role: Role.STUDENT,
      },
    }),
    prisma.user.create({
      data: {
        name: "Bob Martinez",
        email: "bob@school.test",
        passwordHash: studentPassword,
        role: Role.STUDENT,
      },
    }),
    prisma.user.create({
      data: {
        name: "Charlie Kim",
        email: "charlie@school.test",
        passwordHash: studentPassword,
        role: Role.STUDENT,
      },
    }),
  ]);

  console.log("✅ Users created");

  // ─── Sports ────────────────────────────────────────────────────
  const boxing = await prisma.sport.create({
    data: {
      name: "Boxing",
      slug: "boxing",
      description:
        "Master the sweet science — footwork, combinations, defense, and ring strategy from beginner to advanced.",
      coverImageUrl: "/images/sports/boxing.jpg",
      accentColor: "#ef4444",
      sequentialUnlock: true,
      isPublished: true,
    },
  });

  const football = await prisma.sport.create({
    data: {
      name: "Football",
      slug: "football",
      description:
        "Develop elite technical skills, tactical awareness, and physical conditioning for modern football.",
      coverImageUrl: "/images/sports/football.jpg",
      accentColor: "#22c55e",
      sequentialUnlock: false,
      isPublished: true,
    },
  });

  const tennis = await prisma.sport.create({
    data: {
      name: "Tennis",
      slug: "tennis",
      description:
        "From groundstrokes to serve-and-volley tactics, build your complete tennis game.",
      coverImageUrl: "/images/sports/tennis.jpg",
      accentColor: "#eab308",
      sequentialUnlock: false,
      isPublished: true,
    },
  });

  console.log("✅ Sports created");

  // ─── Boxing Modules (13) ────────────────────────────────────────
  const boxingModuleData = [
    { title: "Introduction to Boxing", description: "History, equipment, and safety rules." },
    { title: "Stance & Footwork Fundamentals", description: "Orthodox vs southpaw, balance, and movement drills." },
    { title: "Jab Mechanics", description: "The most important punch — snap, speed, and accuracy." },
    { title: "The Cross (Straight Right)", description: "Power generation from the hips and shoulder rotation." },
    { title: "Hook Technique", description: "Left hook and right hook mechanics and timing." },
    { title: "Uppercut Mastery", description: "Inside fighting and body uppercuts." },
    { title: "Defense: Slip & Roll", description: "Head movement to avoid punches without stepping back." },
    { title: "Guard & Blocking", description: "High guard, cross-arm defense, and parrying." },
    { title: "Basic Combinations", description: "1-2, 1-2-3, 1-1-2 and their counter options." },
    { title: "Ring Generalship", description: "Cutting off the ring, using the corners, and pacing." },
    { title: "Body Attack Strategy", description: "Targeting the liver and solar plexus effectively." },
    { title: "Counter-Punching", description: "Reading opponent patterns and timing your counters." },
    { title: "Sparring Tactics & Game Planning", description: "Match preparation, studying opponents, and adapting mid-round." },
  ];

  const boxingModules = await Promise.all(
    boxingModuleData.map((m, i) =>
      prisma.module.create({
        data: {
          sportId: boxing.id,
          title: m.title,
          description: m.description,
          order: i + 1,
          requireVideoWatch: true,
          requireTestPass: i < 10, // last 3 modules: video only (no test required)
          isPublished: true,
        },
      })
    )
  );

  // ─── Football Modules (6) ───────────────────────────────────────
  const footballModuleData = [
    { title: "Ball Control Basics", description: "First touch, dribbling foundations, and close control." },
    { title: "Passing & Receiving", description: "Short pass, long pass, weighted through-balls." },
    { title: "Shooting Technique", description: "Instep drive, curling, low driven shots." },
    { title: "Defensive Principles", description: "Pressing, tracking runs, and 1v1 defending." },
    { title: "Tactical Formations", description: "Understanding 4-4-2, 4-3-3, 3-5-2 and transitions." },
    { title: "Set Pieces", description: "Corners, free kicks, throw-ins as strategic opportunities." },
  ];

  const footballModules = await Promise.all(
    footballModuleData.map((m, i) =>
      prisma.module.create({
        data: {
          sportId: football.id,
          title: m.title,
          description: m.description,
          order: i + 1,
          requireVideoWatch: true,
          requireTestPass: true,
          isPublished: true,
        },
      })
    )
  );

  // ─── Tennis Modules (6) ─────────────────────────────────────────
  const tennisModuleData = [
    { title: "Grip & Stance", description: "Eastern, Western, continental grips and ready position." },
    { title: "Forehand Groundstroke", description: "Topspin forehand mechanics and patterns." },
    { title: "Backhand Technique", description: "Two-handed and one-handed backhand fundamentals." },
    { title: "Serve Mechanics", description: "Flat, slice, and kick serves — toss, trophy, contact." },
    { title: "Volley & Net Play", description: "Approach shots, volleys, and overhead smash." },
    { title: "Match Strategy & Mental Game", description: "Pattern play, reading opponents, and composure under pressure." },
  ];

  const tennisModules = await Promise.all(
    tennisModuleData.map((m, i) =>
      prisma.module.create({
        data: {
          sportId: tennis.id,
          title: m.title,
          description: m.description,
          order: i + 1,
          requireVideoWatch: true,
          requireTestPass: true,
          isPublished: true,
        },
      })
    )
  );

  console.log("✅ Modules created (Boxing: 13, Football: 6, Tennis: 6)");

  // ─── Add YouTube placeholder videos to all modules ──────────────
  // Using public YouTube boxing/football/tennis tutorial videos as placeholders
  const youtubeVideos = [
    // Boxing (13 modules) - using public tutorial videos
    "https://www.youtube.com/watch?v=hMoTnbVCho4", // boxing basics
    "https://www.youtube.com/watch?v=4Nk9o_B1JY4",
    "https://www.youtube.com/watch?v=ZjLKR7c8zig",
    "https://www.youtube.com/watch?v=EqMQBkGghXg",
    "https://www.youtube.com/watch?v=7G1ZjpT9Rpk",
    "https://www.youtube.com/watch?v=RHqdmPnZuO8",
    "https://www.youtube.com/watch?v=ZjLKR7c8zig",
    "https://www.youtube.com/watch?v=hMoTnbVCho4",
    "https://www.youtube.com/watch?v=4Nk9o_B1JY4",
    "https://www.youtube.com/watch?v=EqMQBkGghXg",
    "https://www.youtube.com/watch?v=7G1ZjpT9Rpk",
    "https://www.youtube.com/watch?v=RHqdmPnZuO8",
    "https://www.youtube.com/watch?v=hMoTnbVCho4",
  ];

  await Promise.all(
    boxingModules.map((m, i) =>
      prisma.video.create({
        data: {
          moduleId: m.id,
          provider: VideoProvider.YOUTUBE,
          externalUrl: youtubeVideos[i],
          durationSec: 600 + i * 120,
          isReady: true,
        },
      })
    )
  );

  await Promise.all(
    footballModules.map((m, i) =>
      prisma.video.create({
        data: {
          moduleId: m.id,
          provider: VideoProvider.YOUTUBE,
          externalUrl: "https://www.youtube.com/watch?v=9WqMtUG3iBM",
          durationSec: 480 + i * 90,
          isReady: true,
        },
      })
    )
  );

  await Promise.all(
    tennisModules.map((m, i) =>
      prisma.video.create({
        data: {
          moduleId: m.id,
          provider: VideoProvider.YOUTUBE,
          externalUrl: "https://www.youtube.com/watch?v=8XnK2xB7VgQ",
          durationSec: 420 + i * 90,
          isReady: true,
        },
      })
    )
  );

  console.log("✅ Videos linked");

  // ─── Tests & Questions ─────────────────────────────────────────
  // Create tests for first 10 boxing modules and all football/tennis modules
  
  async function createTest(moduleId: string, moduleTitle: string) {
    const test = await prisma.test.create({
      data: {
        moduleId,
        title: `${moduleTitle} — Assessment`,
        passPercent: 70,
        timeLimitSec: 600, // 10 min
        maxAttempts: 3,
        shuffleQuestions: true,
        shuffleOptions: true,
        revealAnswers: true,
      },
    });

    // MCQ Single correct
    const q1 = await prisma.question.create({
      data: {
        testId: test.id,
        type: QuestionType.MCQ_SINGLE,
        prompt: `What is the primary focus of "${moduleTitle}"?`,
        marks: 2,
        explanation: `This question tests understanding of the core concept of ${moduleTitle}.`,
        order: 1,
      },
    });
    await prisma.option.createMany({
      data: [
        { questionId: q1.id, text: `Core techniques of ${moduleTitle}`, isCorrect: true, order: 1 },
        { questionId: q1.id, text: "General fitness", isCorrect: false, order: 2 },
        { questionId: q1.id, text: "Diet and nutrition", isCorrect: false, order: 3 },
        { questionId: q1.id, text: "Equipment maintenance", isCorrect: false, order: 4 },
      ],
    });

    // MCQ Multi correct
    const q2 = await prisma.question.create({
      data: {
        testId: test.id,
        type: QuestionType.MCQ_MULTI,
        prompt: "Which of the following are important aspects of this module? (Select all that apply)",
        marks: 3,
        explanation: "Multiple aspects contribute to mastery of each module.",
        order: 2,
      },
    });
    await prisma.option.createMany({
      data: [
        { questionId: q2.id, text: "Technique and form", isCorrect: true, order: 1 },
        { questionId: q2.id, text: "Consistent practice", isCorrect: true, order: 2 },
        { questionId: q2.id, text: "Understanding the purpose", isCorrect: true, order: 3 },
        { questionId: q2.id, text: "Ignoring fundamentals", isCorrect: false, order: 4 },
      ],
    });

    // Short answer
    const q3 = await prisma.question.create({
      data: {
        testId: test.id,
        type: QuestionType.SHORT_ANSWER,
        prompt: "In one word, what sport are you studying in this course?",
        marks: 1,
        explanation: "This ensures students are enrolled in the correct course.",
        order: 3,
      },
    });

    return { test, q3 };
  }

  // Boxing tests (modules 1-10)
  const boxingTestResults: Array<{ test: { id: string }, q3: { id: string } }> = [];
  for (let i = 0; i < 10; i++) {
    const result = await createTest(boxingModules[i].id, boxingModuleData[i].title);
    boxingTestResults.push(result);
  }

  // Add accepted short answers for boxing
  for (const { q3 } of boxingTestResults) {
    await prisma.acceptedAnswer.createMany({
      data: [
        { questionId: q3.id, text: "boxing", caseInsensitive: true, trimWhitespace: true, fuzzyMatch: true, levenshteinThreshold: 1 },
        { questionId: q3.id, text: "Boxing", caseInsensitive: true, trimWhitespace: true, fuzzyMatch: false },
      ],
    });
  }

  // Football tests
  const footballTestResults: Array<{ test: { id: string }, q3: { id: string } }> = [];
  for (let i = 0; i < footballModules.length; i++) {
    const result = await createTest(footballModules[i].id, footballModuleData[i].title);
    footballTestResults.push(result);
  }
  for (const { q3 } of footballTestResults) {
    await prisma.acceptedAnswer.createMany({
      data: [
        { questionId: q3.id, text: "football", caseInsensitive: true, trimWhitespace: true, fuzzyMatch: true, levenshteinThreshold: 1 },
        { questionId: q3.id, text: "soccer", caseInsensitive: true, trimWhitespace: true, fuzzyMatch: false },
      ],
    });
  }

  // Tennis tests
  const tennisTestResults: Array<{ test: { id: string }, q3: { id: string } }> = [];
  for (let i = 0; i < tennisModules.length; i++) {
    const result = await createTest(tennisModules[i].id, tennisModuleData[i].title);
    tennisTestResults.push(result);
  }
  for (const { q3 } of tennisTestResults) {
    await prisma.acceptedAnswer.createMany({
      data: [
        { questionId: q3.id, text: "tennis", caseInsensitive: true, trimWhitespace: true, fuzzyMatch: true, levenshteinThreshold: 1 },
      ],
    });
  }

  console.log("✅ Tests and questions created");

  // ─── Enrollments ────────────────────────────────────────────────
  await prisma.enrollment.createMany({
    data: [
      { userId: alice.id, sportId: boxing.id },
      { userId: alice.id, sportId: football.id },
      { userId: bob.id, sportId: boxing.id },
      { userId: bob.id, sportId: tennis.id },
      { userId: charlie.id, sportId: football.id },
      { userId: charlie.id, sportId: tennis.id },
    ],
  });

  console.log("✅ Enrollments created");

  // ─── Partial Progress (so dashboard looks real) ──────────────────
  // Alice: Boxing 3/13 completed, Football 2/6 completed
  async function markModuleComplete(userId: string, module: { id: string }) {
    await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId: module.id } },
      create: {
        userId,
        moduleId: module.id,
        watchedSec: 600,
        watchPercent: 1.0,
        videoCompleted: true,
        testPassed: true,
        isCompleted: true,
        completedAt: new Date(),
        lastWatchedAt: new Date(),
      },
      update: {
        watchedSec: 600,
        watchPercent: 1.0,
        videoCompleted: true,
        testPassed: true,
        isCompleted: true,
        completedAt: new Date(),
        lastWatchedAt: new Date(),
      },
    });
  }

  async function markModuleInProgress(userId: string, module: { id: string }, watchPercent: number) {
    await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId: module.id } },
      create: {
        userId,
        moduleId: module.id,
        watchedSec: 600 * watchPercent,
        watchPercent,
        videoCompleted: watchPercent >= 0.9,
        testPassed: false,
        isCompleted: false,
        lastWatchedAt: new Date(),
      },
      update: {
        watchedSec: 600 * watchPercent,
        watchPercent,
        videoCompleted: watchPercent >= 0.9,
        lastWatchedAt: new Date(),
      },
    });
  }

  // Alice: Boxing 3 completed, 1 in progress
  await markModuleComplete(alice.id, boxingModules[0]);
  await markModuleComplete(alice.id, boxingModules[1]);
  await markModuleComplete(alice.id, boxingModules[2]);
  await markModuleInProgress(alice.id, boxingModules[3], 0.45);

  // Alice: Football 2 completed
  await markModuleComplete(alice.id, footballModules[0]);
  await markModuleComplete(alice.id, footballModules[1]);
  await markModuleInProgress(alice.id, footballModules[2], 0.3);

  // Bob: Boxing 1 completed
  await markModuleComplete(bob.id, boxingModules[0]);
  await markModuleInProgress(bob.id, boxingModules[1], 0.6);

  // Bob: Tennis 2 completed
  await markModuleComplete(bob.id, tennisModules[0]);
  await markModuleComplete(bob.id, tennisModules[1]);

  // Charlie: Football 4 completed
  await markModuleComplete(charlie.id, footballModules[0]);
  await markModuleComplete(charlie.id, footballModules[1]);
  await markModuleComplete(charlie.id, footballModules[2]);
  await markModuleComplete(charlie.id, footballModules[3]);
  await markModuleInProgress(charlie.id, footballModules[4], 0.7);

  // Charlie: Tennis 1 completed
  await markModuleComplete(charlie.id, tennisModules[0]);

  console.log("✅ Partial progress seeded");

  // ─── Sample Attempts (so history looks real) ────────────────────
  // Alice passed boxing module 1 test on attempt 2
  const boxingTest1 = await prisma.test.findUnique({ where: { moduleId: boxingModules[0].id } });
  if (boxingTest1) {
    await prisma.attempt.create({
      data: {
        userId: alice.id,
        testId: boxingTest1.id,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 300000),
        score: 4,
        maxScore: 6,
        percent: 66.7,
        passed: false,
      },
    });
    await prisma.attempt.create({
      data: {
        userId: alice.id,
        testId: boxingTest1.id,
        status: "SUBMITTED",
        startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 300000),
        score: 5,
        maxScore: 6,
        percent: 83.3,
        passed: true,
      },
    });
  }

  console.log("✅ Sample attempts seeded");
  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Credentials:");
  console.log("  Admin:   admin@school.test / Admin@123!");
  console.log("  Student: alice@school.test / Student@123!");
  console.log("  Student: bob@school.test   / Student@123!");
  console.log("  Student: charlie@school.test / Student@123!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
