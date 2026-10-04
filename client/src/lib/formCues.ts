import { patternFor } from '@/components/ExerciseAnimation';
import type { Exercise } from '@/types';

/**
 * The corrections a coach actually calls out mid-set. Keyed by movement pattern rather than by
 * exercise, because form errors are pattern-level - knees caving is a squat problem whether you
 * are on a barbell, a goblet squat or a leg press - so every exercise in the library gets cues,
 * including ones added later.
 */
export interface FormCue { wrong: string; fix: string }

const CUES: Record<string, FormCue[]> = {
  squat: [
    { wrong: 'Knees caving inwards as you stand up', fix: 'Push the knees out over your middle toes. Think about spreading the floor apart with your feet.' },
    { wrong: 'Heels lifting, weight rolling onto the toes', fix: 'Keep the whole foot planted. If the heels still lift, widen your stance slightly and go less deep.' },
    { wrong: 'Hips shooting up first so it becomes a good morning', fix: 'Lead out of the bottom with your chest, and make the hips and shoulders rise together.' },
  ],
  hinge: [
    { wrong: 'Rounding the lower back to reach the bar', fix: 'Push the hips back and keep the back flat. Bend the knees a little more rather than rounding.' },
    { wrong: 'Squatting the weight up instead of hinging', fix: 'The hips travel backwards, not down. Shins stay close to vertical.' },
    { wrong: 'Letting the bar drift away from your legs', fix: 'Keep it brushing your thighs the whole way up and down.' },
  ],
  swing: [
    { wrong: 'Squatting down and lifting the bell with the arms', fix: 'It is a hip snap. Hike the bell back between your legs, then drive the hips forward hard - the arms are just rope.' },
    { wrong: 'Swinging above shoulder height and arching the back', fix: 'Chest height is plenty. Finish standing tall with the glutes squeezed.' },
  ],
  bench: [
    { wrong: 'Elbows flared straight out to the sides', fix: 'Tuck them to about 45 degrees from your body. This is the single biggest cause of sore shoulders from pressing.' },
    { wrong: 'Bouncing the bar off your chest', fix: 'Touch lightly, pause, then press. Lower over two seconds.' },
    { wrong: 'Shoulders rolling forward off the bench', fix: 'Pinch the shoulder blades together and keep them pinned down the whole set.' },
  ],
  pushup: [
    { wrong: 'Hips sagging towards the floor', fix: 'Squeeze the glutes and brace the stomach so you stay in one straight line.' },
    { wrong: 'Only going down a few inches', fix: 'Chest to within a fist of the floor. Drop to your knees rather than cutting the range.' },
  ],
  overhead: [
    { wrong: 'Arching the lower back to get the weight up', fix: 'Squeeze the glutes and keep the ribs down. Brace as if someone is about to poke your stomach.' },
    { wrong: 'Pressing around the front of your face', fix: 'Move your head back slightly and press straight up so the weight finishes over the middle of your feet.' },
  ],
  row: [
    { wrong: 'Rocking the torso back and forth to move the weight', fix: 'Keep the chest still. If you have to rock, the weight is too heavy.' },
    { wrong: 'Pulling with the arms only', fix: 'Start the pull by drawing the shoulder blades together, then bend the elbows.' },
  ],
  bentrow: [
    { wrong: 'Standing up a little on every rep', fix: 'Lock the hinge in and hold it. Only the arms move.' },
    { wrong: 'Rounding the back under the load', fix: 'Flat back, chest proud, brace hard before the first rep.' },
  ],
  pulldown: [
    { wrong: 'Leaning far back so it turns into a row', fix: 'Only a slight lean. Pull the bar to your upper chest, not your stomach.' },
    { wrong: 'Shoulders shrugging up at the top of each rep', fix: 'Pull the shoulder blades down first, then let the elbows follow.' },
  ],
  curl: [
    { wrong: 'Swinging the body to throw the weight up', fix: 'Pin the elbows to your ribs and stand still. Lighter weight, strict reps.' },
    { wrong: 'Dropping the weight back down fast', fix: 'Three seconds on the way down - that half of the rep builds the most muscle.' },
  ],
  pushdown: [
    { wrong: 'Leaning over the bar so the chest and shoulders help', fix: 'Stand tall, a slight forward lean only. Nothing but the forearms should move.' },
    { wrong: 'Elbows drifting forward away from your sides', fix: 'Keep them glued to your ribs for the whole set.' },
  ],
  overheadext: [
    { wrong: 'Elbows flaring out wide', fix: 'Keep them pointing forward and close to your head so the triceps does the work.' },
    { wrong: 'Ribs flaring and the back arching', fix: 'Brace the stomach and tuck the ribs down before you start.' },
  ],
  lateral: [
    { wrong: 'Swinging and shrugging to lift a heavier dumbbell', fix: 'Go lighter than feels right, lead with the elbows, stop level with your shoulders.' },
    { wrong: 'Raising above shoulder height', fix: 'Past shoulder height the traps take over and the side delt stops working.' },
  ],
  fly: [
    { wrong: 'Straightening the arms so it becomes a press', fix: 'Set a slight elbow bend at the start and keep that exact angle the whole rep.' },
    { wrong: 'Going so deep you feel it in the front of the shoulder joint', fix: 'Stop when you feel a broad stretch across the chest, not a pinch at the shoulder.' },
  ],
  plank: [
    { wrong: 'Hips sagging down or piking up', fix: 'Squeeze the glutes and brace. Straight line from ear to ankle.' },
    { wrong: 'Holding your breath to stay tight', fix: 'Keep breathing steadily. If you cannot breathe, shorten the hold.' },
  ],
  crunch: [
    { wrong: 'Pulling on the back of your neck with your hands', fix: 'Fingertips light at the temples, eyes on the ceiling, lead with the ribs.' },
    { wrong: 'Using momentum to bounce up and down', fix: 'Slow up, slow down, and pause for a second at the top.' },
  ],
  legext: [
    { wrong: 'Swinging the weight up and letting it crash down', fix: 'Pause for a second at the top with the knee straight, then lower over three seconds.' },
  ],
  legcurl: [
    { wrong: 'Hips lifting off the pad to get more range', fix: 'Keep the hips pinned down. If they rise, the weight is too heavy.' },
  ],
  calf: [
    { wrong: 'Short bouncy reps using the tendon, not the muscle', fix: 'Full stretch at the bottom, two-second squeeze at the top.' },
  ],
  legpress: [
    { wrong: 'Lower back rounding off the pad at the bottom', fix: 'Stop the moment your hips start to tuck under. That is your depth.' },
    { wrong: 'Snapping the knees into a hard lockout', fix: 'Stop just short of straight and keep the tension on the muscle.' },
  ],
  run: [
    { wrong: 'Holding onto the rails', fix: 'Let your arms swing. Holding on removes most of the work and wrecks your stride.' },
    { wrong: 'Overstriding and landing hard on the heel', fix: 'Shorter, quicker steps landing underneath your hips.' },
  ],
  cycle: [
    { wrong: 'Saddle set too low, so the knees ache', fix: 'At the bottom of the stroke your knee should have only a slight bend.' },
    { wrong: 'Rocking the hips side to side', fix: 'Drop the resistance until you can spin smoothly with a still torso.' },
  ],
  rowing: [
    { wrong: 'Pulling with the arms before the legs', fix: 'Legs, then body, then arms. Reverse that exact order on the way back.' },
    { wrong: 'Rounding the back at the catch', fix: 'Hinge from the hips with the chest up and shins vertical.' },
  ],
  generic: [
    { wrong: 'Rushing the lowering half of the rep', fix: 'Control the weight down over two to three seconds.' },
    { wrong: 'Cutting the range short as you tire', fix: 'Full range with less weight beats a half rep with more.' },
  ],
};

/** Form cues for an exercise, matched through its movement pattern. */
export function formCuesFor(exercise: Pick<Exercise, 'name' | 'type' | 'primaryMuscle'>): FormCue[] {
  return CUES[patternFor(exercise).key] || CUES.generic;
}
