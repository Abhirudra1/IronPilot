/**
 * Warm-up and cool-down routines, composed from the muscle groups a session actually trains.
 *
 * Warm-up follows the standard RAMP order (Raise -> Mobilise -> Activate -> Potentiate): general
 * cardio to raise temperature, dynamic mobility for the joints involved, activation for the
 * muscles about to work, then light ramp-up sets of the first lift. Cool-down brings the heart
 * rate down and holds static stretches for what was trained - static stretching belongs here and
 * not in the warm-up, where it temporarily reduces force output.
 */

/** Same convention as the exercise library: a search link never rots the way a video id does. */
const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${q} proper form technique`)}`;

const RAISE = {
  key: 'raise', name: 'Easy cardio to raise temperature', durationSeconds: 180,
  how: 'Treadmill walk on a slight incline, bike or rower at a pace where you could still hold a conversation.',
  why: 'Lifts core temperature, heart rate and joint fluid so muscles stretch further before they tear.',
  mistake: 'Going too hard. This is not the workout - if you are out of breath you have burned energy you needed for the first set.',
};

const COOL_RAISE = {
  key: 'cool-raise', name: 'Easy walk or cycle', durationSeconds: 180,
  how: 'Very light pace, no resistance. Breathe in through the nose for 4, out for 6.',
  why: 'Brings the heart rate down gradually instead of stopping dead, which helps you stop feeling light-headed and starts recovery.',
  mistake: 'Stopping dead and sitting down. Blood pools in the legs and you feel light-headed.',
};

const BREATHE = {
  key: 'breathe', name: 'Slow breathing', durationSeconds: 60,
  how: 'Lie or sit down. In through the nose 4 seconds, out through the mouth 6-8 seconds.',
  why: 'Shifts you out of fight-or-flight so sleep and recovery start sooner after a hard session.',
  mistake: 'Breathing into the chest. The belly should rise first, not the shoulders.',
};

/** Dynamic drills before training (per muscle group). */
const MOBILITY = {
  chest: [{ name: 'Arm circles', sets: 1, reps: 20, how: 'Ten circles forward, ten back, arms straight and relaxed.', why: 'Takes the shoulder through its full range before you load it with a press.', mistake: 'Shrugging the shoulders up to the ears. Keep them down and let the arm move in the socket.' }],
  back: [{ name: 'Cat-cow', sets: 1, reps: 10, how: 'On all fours, arch and round the spine slowly with your breath.', why: 'Frees the spine segment by segment so you can brace properly when pulling.', mistake: 'Rushing it and only bending at the lower back. Move one vertebra at a time from the tailbone up.' }],
  shoulders: [{ name: 'Band or stick pass-through', sets: 1, reps: 10, how: 'Wide grip, take a band overhead and behind you with straight arms. Narrow the grip as it loosens.', why: 'Opens the front of the shoulder so overhead work does not pinch.', mistake: 'Gripping too narrow too soon, so the elbows bend and the ribs flare. Start wider than feels necessary.' }],
  biceps: [{ name: 'Elbow circles', sets: 1, reps: 20, how: 'Arms out, rotate the forearms in small circles both directions.', why: 'Warms the elbow joint and biceps tendon before curling.', mistake: 'Swinging the whole arm. Only the forearm should move.' }],
  triceps: [{ name: 'Overhead elbow extensions', sets: 1, reps: 15, how: 'Hand behind the head, straighten and bend the elbow with no weight.', why: 'Prepares the elbow for pressing and extension work.', mistake: 'Letting the elbow drift out to the side. Keep it pointing at the ceiling.' }],
  forearms: [{ name: 'Wrist circles', sets: 1, reps: 20, how: 'Fingers interlocked, circle the wrists both directions.', why: 'Loosens the wrists so they stay neutral under a loaded bar.', mistake: 'Forcing the range. These should feel easy, never sharp.' }],
  core: [{ name: 'Standing torso twists', sets: 1, reps: 20, how: 'Feet planted, rotate the ribcage side to side without swinging the arms.', why: 'Wakes up the obliques and warms the lower back before bracing.', mistake: 'Throwing the arms for momentum and twisting from the lower back. Rotate the ribs, keep the hips still.' }],
  quads: [{ name: 'Bodyweight squat to depth', sets: 1, reps: 10, how: 'Slow, all the way down, knees tracking over the toes.', why: 'Grooves the squat pattern and warms knees and hips before load.', mistake: 'Heels lifting and knees caving in. Spread the floor with your feet and sit between your hips.' }],
  hamstrings: [{ name: 'Leg swings front to back', sets: 1, reps: 20, how: 'Hold something solid, swing each leg forward and back ten times, controlled.', why: 'Lengthens the hamstring dynamically so hinging feels loose, not tight.', mistake: 'Swinging as high as possible and arching the lower back to get there. Keep the torso still and let range build.' }],
  glutes: [{ name: 'Hip circles', sets: 1, reps: 20, how: 'Knee up to hip height, draw ten circles out and ten in per leg.', why: 'Opens the hip capsule before squatting or hinging.', mistake: 'Leaning the torso away to make the circle bigger. Stand tall and make a smaller, honest circle.' }],
  calves: [{ name: 'Ankle circles and rocks', sets: 1, reps: 20, how: 'Circle each ankle, then rock heel-to-toe ten times.', why: 'Ankles that move well let you squat deeper without the heels lifting.', mistake: 'Rushing tiny circles. Slow down and push the end of the range in each direction.' }],
  full_body: [{ name: "World's greatest stretch", sets: 1, reps: 10, how: 'Deep lunge, elbow to the inside of the front foot, then rotate the top arm to the ceiling. Five per side.', why: 'Covers hips, spine and shoulders in one drill when the session hits everything.', mistake: 'Letting the back knee drop and the hips sag. Keep the back leg long and the front shin vertical.' }],
  cardio: [{ name: 'Leg swings and ankle rocks', sets: 1, reps: 20, how: 'Ten swings per leg, then rock heel-to-toe.', why: 'Loosens the joints that absorb every step before you pick up the pace.', mistake: 'Bouncing at the end of the swing. Controlled momentum only.' }],
};

/** Light, targeted work that switches the muscle on before it has to move real load. */
const ACTIVATION = {
  chest: [{ name: 'Band pull-apart', sets: 2, reps: 15, how: 'Light band at chest height, pull it apart until your hands are in line with your chest, squeeze the shoulder blades.', why: 'Wakes the upper back so the shoulders sit back and safe while you press.', mistake: 'Using a band so heavy the shoulders roll forward and the neck strains. Lighter band, hold the squeeze for a second.' }],
  back: [{ name: 'Scapular pull-ups or shrugs', sets: 2, reps: 10, how: 'Hang from the bar with straight arms and pull the shoulder blades down only - no elbow bend.', why: 'Teaches the lats to start the pull instead of the biceps taking over.', mistake: 'Bending the elbows and turning it into a tiny pull-up. The arms stay straight the whole time.' }],
  shoulders: [{ name: 'Band face pull', sets: 2, reps: 15, how: 'Light band at eye level, pull towards the forehead with elbows high.', why: 'Fires the rear delts and rotator cuff, the pair most often skipped and most often injured.', mistake: 'Dropping the elbows so it becomes a row. Keep the elbows at or above shoulder height.' }],
  biceps: [{ name: 'Light band curl', sets: 2, reps: 15, how: 'Very light resistance, full range, slow on the way down.', why: 'Gets blood into the muscle so the first working set is not the warm-up set.', mistake: 'Swinging the elbows forward at the top. Pin them to your ribs.' }],
  triceps: [{ name: 'Band pushdown', sets: 2, reps: 15, how: 'Light band, elbows pinned to your sides, full lockout.', why: 'Primes the elbow and triceps so heavy pressing does not start cold.', mistake: 'Leaning over the band and pressing with the shoulders. Stand tall, only the forearm moves.' }],
  forearms: [{ name: 'Light wrist curls', sets: 2, reps: 15, how: 'Very light dumbbell, forearm on your thigh, curl the wrist up and down.', why: 'Builds grip readiness so your hands are not the thing that fails first.', mistake: 'Going heavy. This is circulation, not a working set.' }],
  core: [{ name: 'Dead bug', sets: 2, reps: 16, how: 'On your back, lower the opposite arm and leg while keeping the lower back flat. Eight per side.', why: 'Trains the brace you need to protect the spine under a heavy bar.', mistake: 'The lower back arching off the floor as the leg lowers. Only go as low as you can keep it flat - breathe out as you extend.' }],
  quads: [{ name: 'Wall sit', sets: 2, reps: 0, durationSeconds: 20, how: 'Back on the wall, thighs parallel to the floor, hold.', why: 'Switches the quads on so the first squat set does not feel like a shock.', mistake: 'Sitting too high to make it easy, or holding your breath. Thighs parallel, keep breathing.' }],
  hamstrings: [{ name: 'Glute bridge', sets: 2, reps: 12, how: 'On your back, drive through the heels, squeeze at the top for a second.', why: 'Connects glutes and hamstrings so the hinge is not all lower back.', mistake: 'Pushing the hips so high the back arches. Stop when hips, knees and shoulders line up and squeeze the glutes.' }],
  glutes: [{ name: 'Banded glute bridge or clamshell', sets: 2, reps: 12, how: 'Band above the knees, push out against it the whole time.', why: 'Glutes that are switched on keep the knees tracking out under load.', mistake: 'Letting the band pull the knees together on the way down. Resist it the whole rep.' }],
  calves: [{ name: 'Bodyweight calf raise', sets: 2, reps: 15, how: 'Slow up, two-second pause at the top, slow down.', why: 'Warms the Achilles, which takes a lot of force on every jump and step.', mistake: 'Bouncing off the bottom. The stretch at the bottom is the point.' }],
  full_body: [{ name: 'Bodyweight squat and push-up', sets: 2, reps: 10, how: 'Ten squats straight into five push-ups, twice.', why: 'One quick circuit that switches on the whole chain before a full-body day.', mistake: 'Racing it. The hips should sag on neither the squat nor the push-up.' }],
  cardio: [{ name: 'Gradual pace build', sets: 1, reps: 0, durationSeconds: 120, how: 'Start easy and lift the pace every 30 seconds until you reach your working effort.', why: 'Lets the heart rate climb in steps rather than spiking it from a standstill.', mistake: 'Starting at your target pace. The point is the ramp.' }],
};

/** Static holds after training - safe here, because force output no longer matters. */
const STRETCH = {
  chest: [{ name: 'Doorway chest stretch', sets: 2, durationSeconds: 30, how: 'Forearm on the frame at shoulder height, step through and turn away. 30s per side.', why: 'Undoes the rounded-shoulder position pressing leaves you in.', mistake: 'Pushing into sharp pain at the front of the shoulder. Ease back until it is a broad stretch across the chest.' }],
  back: [{ name: "Child's pose with side reach", sets: 2, durationSeconds: 30, how: 'Sit back on your heels, walk the hands out, then to each side.', why: 'Decompresses the spine and opens the lats after pulling.', mistake: 'Lifting the hips off the heels to reach further. Keep sitting back - that is what creates the stretch.' }],
  shoulders: [{ name: 'Cross-body shoulder stretch', sets: 2, durationSeconds: 30, how: 'Pull the arm across the chest with the opposite hand. 30s per side.', why: 'Releases the rear delt and shoulder capsule after overhead work.', mistake: 'Pulling on the elbow joint and shrugging. Pull above the elbow and keep the shoulder down.' }],
  biceps: [{ name: 'Wall biceps stretch', sets: 2, durationSeconds: 30, how: 'Palm flat on a wall behind you, arm straight, rotate away. 30s per side.', why: 'Lengthens a muscle that has been shortening under load for an hour.', mistake: 'Letting the elbow bend. The arm has to stay straight or the biceps never lengthens.' }],
  triceps: [{ name: 'Overhead triceps stretch', sets: 2, durationSeconds: 30, how: 'Hand down the middle of your back, ease the elbow back with the other hand. 30s per side.', why: 'Releases the triceps and the back of the shoulder together.', mistake: 'Arching the lower back to get the elbow further. Ribs down, brace lightly.' }],
  forearms: [{ name: 'Wrist flexor and extensor stretch', sets: 2, durationSeconds: 30, how: 'Arm straight, fingers up then down, gentle pull with the other hand.', why: 'Settles the forearms after gripping hard all session.', mistake: 'Cranking it. Wrists respond to gentle and long, not hard and short.' }],
  core: [{ name: 'Cobra and lying twist', sets: 2, durationSeconds: 30, how: 'Press the chest up with the hips down, then lie back and drop the knees to each side.', why: 'Extends a spine that has been braced and flexed repeatedly.', mistake: 'Throwing the head back and cranking the lower back. Lead with the chest, keep the neck long.' }],
  quads: [{ name: 'Standing quad stretch', sets: 2, durationSeconds: 30, how: 'Heel to your backside, knees together, hips pushed forward. 30s per side.', why: 'Quads shorten under squatting; this gives the knee its range back.', mistake: 'The knee drifting out to the side and the back arching. Knees together, tuck the tailbone under.' }],
  hamstrings: [{ name: 'Seated hamstring stretch', sets: 2, durationSeconds: 30, how: 'One leg straight, hinge from the hips with a flat back. 30s per side.', why: 'Tight hamstrings pull on the lower back - this keeps hinging safe next session.', mistake: 'Rounding the back to reach the toes. Chest to the knee with a flat back, even if you barely move.' }],
  glutes: [{ name: 'Figure-4 stretch', sets: 2, durationSeconds: 30, how: 'Ankle over the opposite knee, pull the far thigh towards you. 30s per side.', why: 'Releases the glute and the deep hip rotators after loaded hip work.', mistake: 'Letting the crossed ankle slide onto the knee joint. Keep it above the kneecap on the thigh.' }],
  calves: [{ name: 'Wall calf stretch', sets: 2, durationSeconds: 30, how: 'Hands on the wall, back leg straight, heel driven down. 30s per side.', why: 'Keeps ankle range so your squat depth does not shrink over time.', mistake: 'The back heel lifting and the foot turning out. Heel down, toes pointing straight at the wall.' }],
  full_body: [{ name: 'Forward fold, quad and chest stretch', sets: 1, durationSeconds: 120, how: 'Thirty seconds each: forward fold, quad per side, doorway chest.', why: 'Covers the main chains in two minutes when the session hit everything.', mistake: 'Bouncing to go deeper. Hold still and breathe out into the stretch.' }],
  cardio: [{ name: 'Calf, hamstring and hip flexor stretch', sets: 1, durationSeconds: 120, how: 'Thirty seconds per position, both sides.', why: 'Targets what running and cycling shorten most.', mistake: 'Skipping the hip flexor. It is the one cycling shortens most and the one everyone forgets.' }],
};

const LEVEL_RAMP = {
  beginner: { sets: 2, note: 'Use the empty bar or the lightest plate - these do not count as working sets.' },
  intermediate: { sets: 2, note: 'Roughly 50% then 70% of your first working weight.' },
  advanced: { sets: 3, note: 'Roughly 40%, 60% then 80% of your first working weight.' },
};

const uniq = (xs) => [...new Set(xs.filter(Boolean))];
const step = (s, i, phase) => ({
  key: s.key || `${phase}-${i}`,
  name: s.name,
  sets: s.sets || 1,
  reps: s.reps || 0,
  durationSeconds: s.durationSeconds || 0,
  how: s.how,
  why: s.why,
  mistake: s.mistake,
  video: s.video || yt(s.name),
});

/** Muscle groups worth warming, capped so the routine stays short enough to actually be done. */
function targets(muscleGroups) {
  const list = uniq((muscleGroups || []).map((m) => String(m).toLowerCase()).filter((m) => MOBILITY[m]));
  if (!list.length) return ['full_body'];
  return list.slice(0, 3);
}

/**
 * Warm-up for the groups this session trains.
 * @param {string[]} muscleGroups
 * @param {{ firstExercise?: string, level?: string, hasStrength?: boolean }} opts
 */
export function buildWarmup(muscleGroups, { firstExercise, level = 'beginner', hasStrength = true } = {}) {
  const groups = targets(muscleGroups);
  const steps = [RAISE];
  for (const g of groups) steps.push(...(MOBILITY[g] || []));
  for (const g of groups) steps.push(...(ACTIVATION[g] || []));
  if (hasStrength && firstExercise) {
    const ramp = LEVEL_RAMP[level] || LEVEL_RAMP.beginner;
    steps.push({
      key: 'ramp', name: `Ramp-up sets: ${firstExercise}`, sets: ramp.sets, reps: 8, how: ramp.note,
      why: 'Rehearses the exact movement and load path so the first working set is not the first time your body sees it today.',
      mistake: 'Treating these as working sets and going to failure. They should feel easy - you are rehearsing, not training.',
      video: yt(firstExercise),
    });
  }
  const list = steps.map((s, i) => step(s, i, 'warmup'));
  return {
    phase: 'warmup',
    title: 'Warm-up',
    when: 'Do this immediately before your first working set - the benefit fades after about 10 minutes of sitting around.',
    why: 'Cold muscles produce less force and tear more easily. Five to eight minutes here buys you better lifts and fewer strains.',
    totalSeconds: estimate(list),
    steps: list,
  };
}

/** Cool-down for the groups this session trained. */
export function buildCooldown(muscleGroups) {
  const groups = targets(muscleGroups);
  const steps = [COOL_RAISE];
  for (const g of groups) steps.push(...(STRETCH[g] || []));
  steps.push(BREATHE);
  const list = steps.map((s, i) => step(s, i, 'cooldown'));
  return {
    phase: 'cooldown',
    title: 'Cool-down',
    when: 'Start within about 10 minutes of your last set, while you are still warm.',
    why: 'Eases the heart rate down and holds the muscles you just shortened at length, so you move well tomorrow instead of stiff.',
    totalSeconds: estimate(list),
    steps: list,
  };
}

function estimate(steps) {
  return steps.reduce((a, s) => {
    if (s.durationSeconds) return a + s.durationSeconds * (s.sets || 1);
    return a + (s.sets || 1) * (s.reps || 10) * 3; // ~3s per controlled rep
  }, 0);
}

/** One-line text versions, for AI prompts and the weekly plan. */
export function routineText(routine) {
  return routine.steps.map((s) => {
    if (s.durationSeconds) return `${s.name} ${s.sets > 1 ? `${s.sets}x` : ''}${s.durationSeconds}s`;
    return `${s.name} ${s.sets}x${s.reps}`;
  }).join(', ');
}
