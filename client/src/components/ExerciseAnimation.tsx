import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Gauge, ExternalLink } from 'lucide-react';
import type { Exercise } from '@/types';
import { cn } from '@/lib/utils';

/*
 * Animated form guide. A stick figure is tweened between a start pose (a) and an end pose (b) for the
 * exercise's movement pattern, with the working limb highlighted and the current phase labelled.
 * Poses are joint coordinates in a 200x160 viewBox (floor at y=150). Patterns with a `poseAt` produce
 * cyclic motion (running, cycling) instead of a back-and-forth tween.
 */
type Pt = [number, number];
type Pose = Record<string, Pt>;
type Prop =
  | { type: 'floor' } | { type: 'bench'; x: number; y: number; w: number } | { type: 'seat'; x: number; y: number }
  | { type: 'barbell'; at: string } | { type: 'dumbbell'; at: string } | { type: 'kettlebell'; at: string } | { type: 'bar'; at: string }
  | { type: 'cable'; from: string; to: Pt } | { type: 'treadmill' } | { type: 'bike' } | { type: 'plate'; x: number; y: number; w: number; h: number } | { type: 'rail' };
interface Pattern {
  key: string; label: string; phases: [string, string]; a: Pose; b: Pose; segments: [string, string][]; highlight: [string, string][];
  props: Prop[]; tempo?: number; poseAt?: (t: number) => Pose;
}

const SIDE_SEGS: [string, string][] = [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['ank', 'toe'], ['sh', 'el'], ['el', 'hd']];
const FRONT_SEGS: [string, string][] = [['neck', 'shL'], ['neck', 'shR'], ['shL', 'hipL'], ['shR', 'hipR'], ['hipL', 'hipR'], ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['hipR', 'kneeR'], ['kneeR', 'ankR'], ['shL', 'elL'], ['elL', 'hdL'], ['shR', 'elR'], ['elR', 'hdR']];
const STAND: Pose = { head: [100, 26], neck: [100, 40], sh: [100, 46], hip: [100, 90], knee: [100, 120], ank: [100, 148], toe: [114, 148], el: [102, 68], hd: [104, 90] };
const SEATED: Pose = { head: [100, 38], neck: [100, 52], sh: [100, 58], hip: [98, 102], knee: [126, 104], ank: [138, 132], toe: [150, 132] };
const HINGED: Pose = { head: [118, 60], neck: [112, 72], sh: [110, 76], hip: [86, 100], knee: [98, 122], ank: [100, 148], toe: [114, 148] };
const ARM: [string, string][] = [['sh', 'el'], ['el', 'hd']];
const LEG: [string, string][] = [['hip', 'knee'], ['knee', 'ank']];

const PATTERNS: Record<string, Pattern> = {
  squat: { key: 'squat', label: 'Squat pattern', phases: ['Sit back & down', 'Drive through heels'], segments: SIDE_SEGS, highlight: LEG, props: [{ type: 'floor' }, { type: 'dumbbell', at: 'hd' }],
    a: { ...STAND, el: [92, 66], hd: [96, 54] }, b: { head: [98, 54], neck: [98, 68], sh: [98, 74], hip: [90, 110], knee: [114, 126], ank: [104, 148], toe: [118, 148], el: [92, 92], hd: [98, 80] } },
  hinge: { key: 'hinge', label: 'Hip hinge', phases: ['Hinge at the hips', 'Stand tall, squeeze glutes'], segments: SIDE_SEGS, highlight: [['neck', 'hip'], ['hip', 'knee']], props: [{ type: 'floor' }, { type: 'barbell', at: 'hd' }],
    a: { ...STAND, el: [103, 70], hd: [104, 92] }, b: { ...HINGED, el: [110, 98], hd: [110, 120] } },
  swing: { key: 'swing', label: 'Kettlebell swing', phases: ['Hike back', 'Snap the hips'], segments: SIDE_SEGS, highlight: [['neck', 'hip'], ['hip', 'knee']], props: [{ type: 'floor' }, { type: 'kettlebell', at: 'hd' }],
    a: { ...HINGED, el: [104, 98], hd: [96, 118] }, b: { ...STAND, el: [122, 60], hd: [144, 70] } },
  bench: { key: 'bench', label: 'Horizontal press', phases: ['Lower to mid-chest', 'Press up & lock out'], segments: SIDE_SEGS, highlight: ARM, props: [{ type: 'floor' }, { type: 'bench', x: 44, y: 100, w: 108 }, { type: 'barbell', at: 'hd' }],
    a: { head: [56, 92], neck: [70, 94], sh: [76, 94], hip: [120, 96], knee: [138, 110], ank: [146, 140], toe: [160, 140], el: [84, 112], hd: [82, 80] },
    b: { head: [56, 92], neck: [70, 94], sh: [76, 94], hip: [120, 96], knee: [138, 110], ank: [146, 140], toe: [160, 140], el: [80, 64], hd: [80, 42] } },
  pushup: { key: 'pushup', label: 'Push-up', phases: ['Lower chest to floor', 'Push the floor away'], segments: SIDE_SEGS, highlight: ARM, props: [{ type: 'floor' }],
    a: { head: [46, 82], neck: [58, 88], sh: [62, 90], hip: [104, 106], knee: [126, 116], ank: [148, 128], toe: [162, 136], el: [64, 120], hd: [64, 150] },
    b: { head: [46, 110], neck: [58, 114], sh: [62, 116], hip: [104, 126], knee: [126, 134], ank: [148, 140], toe: [162, 146], el: [84, 142], hd: [64, 150] } },
  overhead: { key: 'overhead', label: 'Overhead press', phases: ['Press overhead', 'Lower to shoulders'], segments: SIDE_SEGS, highlight: ARM, props: [{ type: 'floor' }, { type: 'dumbbell', at: 'hd' }],
    a: { ...STAND, el: [110, 62], hd: [104, 46] }, b: { ...STAND, el: [104, 30], hd: [102, 10] } },
  row: { key: 'row', label: 'Horizontal pull', phases: ['Pull to the torso', 'Extend with control'], segments: SIDE_SEGS, highlight: [...ARM, ['neck', 'hip']], props: [{ type: 'floor' }, { type: 'seat', x: 86, y: 106 }, { type: 'cable', from: 'hd', to: [198, 74] }],
    a: { ...SEATED, el: [122, 68], hd: [146, 74] }, b: { ...SEATED, el: [86, 78], hd: [104, 76] } },
  bentrow: { key: 'bentrow', label: 'Bent-over row', phases: ['Row to the ribs', 'Lower under control'], segments: SIDE_SEGS, highlight: [...ARM, ['neck', 'hip']], props: [{ type: 'floor' }, { type: 'barbell', at: 'hd' }],
    a: { ...HINGED, el: [110, 100], hd: [110, 124] }, b: { ...HINGED, el: [92, 88], hd: [104, 98] } },
  pulldown: { key: 'pulldown', label: 'Vertical pull', phases: ['Pull to upper chest', 'Control back up'], segments: SIDE_SEGS, highlight: [...ARM, ['neck', 'hip']], props: [{ type: 'floor' }, { type: 'seat', x: 86, y: 106 }, { type: 'cable', from: 'hd', to: [116, -10] }, { type: 'bar', at: 'hd' }],
    a: { ...SEATED, el: [110, 34], hd: [114, 8] }, b: { ...SEATED, el: [108, 66], hd: [112, 54] } },
  curl: { key: 'curl', label: 'Curl', phases: ['Curl up', 'Lower slowly'], segments: SIDE_SEGS, highlight: ARM, props: [{ type: 'floor' }, { type: 'dumbbell', at: 'hd' }],
    a: { ...STAND, el: [102, 70], hd: [106, 92] }, b: { ...STAND, el: [102, 70], hd: [116, 58] } },
  pushdown: { key: 'pushdown', label: 'Triceps push-down', phases: ['Push down & squeeze', 'Return to 90°'], segments: SIDE_SEGS, highlight: ARM, props: [{ type: 'floor' }, { type: 'cable', from: 'hd', to: [118, -10] }],
    a: { ...STAND, el: [104, 72], hd: [116, 60] }, b: { ...STAND, el: [104, 72], hd: [118, 96] } },
  overheadext: { key: 'overheadext', label: 'Overhead extension', phases: ['Extend overhead', 'Lower behind head'], segments: SIDE_SEGS, highlight: ARM, props: [{ type: 'floor' }, { type: 'dumbbell', at: 'hd' }],
    a: { ...STAND, el: [104, 30], hd: [88, 44] }, b: { ...STAND, el: [104, 30], hd: [104, 6] } },
  lateral: { key: 'lateral', label: 'Lateral raise', phases: ['Raise to shoulder height', 'Lower slowly'], segments: FRONT_SEGS, highlight: [['shL', 'elL'], ['elL', 'hdL'], ['shR', 'elR'], ['elR', 'hdR']], props: [{ type: 'floor' }, { type: 'dumbbell', at: 'hdL' }, { type: 'dumbbell', at: 'hdR' }],
    a: { head: [100, 24], neck: [100, 38], shL: [82, 44], shR: [118, 44], hipL: [90, 92], hipR: [110, 92], kneeL: [88, 122], kneeR: [112, 122], ankL: [86, 150], ankR: [114, 150], elL: [78, 68], hdL: [76, 92], elR: [122, 68], hdR: [124, 92] },
    b: { head: [100, 24], neck: [100, 38], shL: [82, 44], shR: [118, 44], hipL: [90, 92], hipR: [110, 92], kneeL: [88, 122], kneeR: [112, 122], ankL: [86, 150], ankR: [114, 150], elL: [56, 52], hdL: [34, 46], elR: [144, 52], hdR: [166, 46] } },
  fly: { key: 'fly', label: 'Chest fly', phases: ['Squeeze together', 'Open to a stretch'], segments: FRONT_SEGS, highlight: [['shL', 'elL'], ['elL', 'hdL'], ['shR', 'elR'], ['elR', 'hdR']], props: [{ type: 'floor' }],
    a: { head: [100, 24], neck: [100, 38], shL: [82, 44], shR: [118, 44], hipL: [90, 96], hipR: [110, 96], kneeL: [82, 124], kneeR: [118, 124], ankL: [82, 150], ankR: [118, 150], elL: [62, 50], hdL: [42, 44], elR: [138, 50], hdR: [158, 44] },
    b: { head: [100, 24], neck: [100, 38], shL: [82, 44], shR: [118, 44], hipL: [90, 96], hipR: [110, 96], kneeL: [82, 124], kneeR: [118, 124], ankL: [82, 150], ankR: [118, 150], elL: [86, 56], hdL: [96, 46], elR: [114, 56], hdR: [104, 46] } },
  plank: { key: 'plank', label: 'Plank hold', phases: ['Brace & breathe', 'Brace & breathe'], tempo: 4, segments: SIDE_SEGS, highlight: [['neck', 'hip']], props: [{ type: 'floor' }],
    a: { head: [44, 88], neck: [58, 92], sh: [62, 94], hip: [106, 100], knee: [128, 104], ank: [152, 112], toe: [164, 120], el: [62, 148], hd: [86, 148] },
    b: { head: [44, 86], neck: [58, 90], sh: [62, 92], hip: [106, 98], knee: [128, 103], ank: [152, 112], toe: [164, 120], el: [62, 148], hd: [86, 148] } },
  crunch: { key: 'crunch', label: 'Crunch', phases: ['Curl the ribs up', 'Lower slowly'], segments: SIDE_SEGS, highlight: [['neck', 'hip']], props: [{ type: 'floor' }],
    a: { head: [58, 122], neck: [72, 124], sh: [78, 124], hip: [112, 126], knee: [136, 100], ank: [156, 130], toe: [168, 130], el: [80, 108], hd: [62, 112] },
    b: { head: [76, 94], neck: [86, 104], sh: [90, 106], hip: [112, 126], knee: [136, 100], ank: [156, 130], toe: [168, 130], el: [92, 90], hd: [76, 90] } },
  legext: { key: 'legext', label: 'Leg extension', phases: ['Extend the knee', 'Lower with control'], segments: SIDE_SEGS, highlight: LEG, props: [{ type: 'floor' }, { type: 'seat', x: 86, y: 106 }],
    a: { ...SEATED, knee: [128, 104], ank: [128, 132], toe: [130, 142], el: [110, 74], hd: [116, 96] }, b: { ...SEATED, knee: [128, 104], ank: [156, 104], toe: [166, 100], el: [110, 74], hd: [116, 96] } },
  legcurl: { key: 'legcurl', label: 'Leg curl', phases: ['Curl heels up', 'Lower slowly'], segments: SIDE_SEGS, highlight: LEG, props: [{ type: 'floor' }, { type: 'bench', x: 40, y: 104, w: 100 }],
    a: { head: [48, 98], neck: [62, 100], sh: [66, 100], hip: [116, 100], knee: [136, 100], ank: [162, 100], toe: [172, 100], el: [78, 114], hd: [92, 114] },
    b: { head: [48, 98], neck: [62, 100], sh: [66, 100], hip: [116, 100], knee: [136, 100], ank: [146, 72], toe: [140, 64], el: [78, 114], hd: [92, 114] } },
  calf: { key: 'calf', label: 'Calf raise', phases: ['Rise onto the toes', 'Lower heels slowly'], segments: SIDE_SEGS, highlight: [['knee', 'ank'], ['ank', 'toe']], props: [{ type: 'floor' }],
    a: STAND, b: { head: [100, 18], neck: [100, 32], sh: [100, 38], hip: [100, 82], knee: [100, 112], ank: [100, 138], toe: [114, 148], el: [102, 60], hd: [104, 82] } },
  legpress: { key: 'legpress', label: 'Leg press', phases: ['Press the platform away', 'Bend to 90°'], segments: SIDE_SEGS, highlight: LEG, props: [{ type: 'floor' }, { type: 'seat', x: 62, y: 108 }, { type: 'plate', x: 158, y: 44, w: 8, h: 40 }],
    a: { head: [48, 60], neck: [60, 68], sh: [64, 72], hip: [86, 104], el: [80, 90], hd: [84, 106], knee: [110, 82], ank: [128, 96], toe: [134, 88] },
    b: { head: [48, 60], neck: [60, 68], sh: [64, 72], hip: [86, 104], el: [80, 90], hd: [84, 106], knee: [130, 74], ank: [154, 62], toe: [158, 54] } },
  run: { key: 'run', label: 'Walking / running', phases: ['Stride', 'Stride'], tempo: 1.2, segments: [['neck', 'hip'], ['hip', 'kneeF'], ['kneeF', 'ankF'], ['ankF', 'toeF'], ['hip', 'kneeB'], ['kneeB', 'ankB'], ['ankB', 'toeB'], ['sh', 'elF'], ['elF', 'hdF'], ['sh', 'elB'], ['elB', 'hdB']], highlight: [['hip', 'kneeF'], ['kneeF', 'ankF']], props: [{ type: 'treadmill' }],
    a: { head: [104, 28], neck: [102, 42], sh: [102, 48], hip: [98, 90], kneeF: [118, 114], ankF: [128, 142], toeF: [140, 140], kneeB: [86, 116], ankB: [72, 140], toeB: [70, 150], elF: [118, 66], hdF: [126, 50], elB: [86, 64], hdB: [80, 82] },
    b: { head: [104, 26], neck: [102, 40], sh: [102, 46], hip: [98, 88], kneeF: [86, 116], ankF: [72, 140], toeF: [70, 150], kneeB: [118, 114], ankB: [128, 142], toeB: [140, 140], elF: [86, 64], hdF: [80, 82], elB: [118, 66], hdB: [126, 50] } },
  cycle: { key: 'cycle', label: 'Cycling', phases: ['Pedal', 'Pedal'], tempo: 1.5, segments: SIDE_SEGS, highlight: LEG, props: [{ type: 'bike' }], a: STAND, b: STAND,
    poseAt: (t) => { const th = t * Math.PI * 2; const c: Pt = [100, 122]; const ank: Pt = [c[0] + 16 * Math.cos(th), c[1] + 16 * Math.sin(th)]; const hip: Pt = [96, 86];
      return { head: [126, 36], neck: [120, 48], sh: [116, 54], hip, knee: [(hip[0] + ank[0]) / 2 + 16, (hip[1] + ank[1]) / 2 - 6], ank, toe: [ank[0] + 10, ank[1]], el: [136, 64], hd: [150, 68] }; } },
  rowing: { key: 'rowing', label: 'Rowing stroke', phases: ['Drive: legs → body → arms', 'Recover: arms → body → legs'], tempo: 2.4, segments: SIDE_SEGS, highlight: [...LEG, ['neck', 'hip']], props: [{ type: 'rail' }, { type: 'cable', from: 'hd', to: [30, 100] }],
    a: { head: [126, 50], neck: [120, 64], sh: [118, 70], hip: [108, 112], knee: [82, 92], ank: [66, 120], toe: [58, 128], el: [96, 86], hd: [78, 100] },
    b: { head: [142, 48], neck: [138, 62], sh: [136, 68], hip: [130, 112], knee: [100, 124], ank: [66, 120], toe: [58, 128], el: [118, 84], hd: [104, 82] } },
  generic: { key: 'generic', label: 'Controlled movement', phases: ['Work', 'Return'], segments: SIDE_SEGS, highlight: [], props: [{ type: 'floor' }],
    a: STAND, b: { ...STAND, head: [100, 23], neck: [100, 37], sh: [100, 43], hip: [100, 88], el: [104, 64], hd: [110, 84] } },
};

/** Pick a movement pattern from the exercise name / muscle. */
export function patternFor(ex: Pick<Exercise, 'name' | 'type' | 'primaryMuscle'>): Pattern {
  const n = ex.name.toLowerCase();
  const has = (...k: string[]) => k.some((s) => n.includes(s));
  if (has('rowing')) return PATTERNS.rowing;
  if (has('cycl', 'bike')) return PATTERNS.cycle;
  if (ex.type === 'cardio' || has('treadmill', 'walk', 'run', 'sprint', 'stair', 'cross trainer', 'elliptical')) return PATTERNS.run;
  if (has('push-up', 'push up', 'pushup')) return PATTERNS.pushup;
  if (has('bench press', 'chest press', 'incline', 'decline press')) return PATTERNS.bench;
  if (has('shoulder press', 'overhead press', 'military')) return PATTERNS.overhead;
  if (has('leg press')) return PATTERNS.legpress;
  if (has('squat', 'lunge')) return PATTERNS.squat;
  if (has('swing')) return PATTERNS.swing;
  if (has('deadlift', 'romanian', 'good morning', 'hinge')) return PATTERNS.hinge;
  if (has('bent', 'barbell row', 'one-arm', 'dumbbell row')) return PATTERNS.bentrow;
  if (has('row', 'face pull')) return PATTERNS.row;
  if (has('pulldown', 'pull-up', 'pull up', 'chin')) return PATTERNS.pulldown;
  if (has('leg curl')) return PATTERNS.legcurl;
  if (has('leg extension')) return PATTERNS.legext;
  if (has('overhead') && has('extension')) return PATTERNS.overheadext;
  if (has('pushdown', 'push-down', 'dip', 'kickback', 'straight-arm')) return PATTERNS.pushdown;
  if (has('curl')) return PATTERNS.curl;
  if (has('lateral raise', 'front raise', 'raise')) return PATTERNS.lateral;
  if (has('fly', 'crossover', 'pec deck')) return PATTERNS.fly;
  if (has('plank')) return PATTERNS.plank;
  if (has('crunch', 'sit-up', 'woodchop', 'leg raise', 'twist') || ex.primaryMuscle === 'core') return PATTERNS.crunch;
  if (has('calf')) return PATTERNS.calf;
  return PATTERNS.generic;
}

const lerp = (a: Pose, b: Pose, p: number): Pose => Object.fromEntries(Object.keys(a).map((k) => [k, [a[k][0] + (b[k][0] - a[k][0]) * p, a[k][1] + (b[k][1] - a[k][1]) * p]]));

function Props({ props, pose }: { props: Prop[]; pose: Pose }) {
  return (
    <g className="text-zinc-400 dark:text-zinc-500" stroke="currentColor" fill="none" strokeWidth={3} strokeLinecap="round">
      {props.map((p, i) => {
        switch (p.type) {
          case 'floor': return <line key={i} x1={10} y1={150} x2={190} y2={150} strokeWidth={2} />;
          case 'rail': return <g key={i}><line x1={40} y1={118} x2={175} y2={118} /><line x1={40} y1={118} x2={40} y2={150} /><line x1={175} y1={118} x2={175} y2={150} /><line x1={10} y1={150} x2={190} y2={150} strokeWidth={2} /></g>;
          case 'bench': return <g key={i}><rect x={p.x} y={p.y} width={p.w} height={8} rx={3} fill="currentColor" stroke="none" opacity={0.5} /><line x1={p.x + 10} y1={p.y + 8} x2={p.x + 10} y2={150} /><line x1={p.x + p.w - 10} y1={p.y + 8} x2={p.x + p.w - 10} y2={150} /></g>;
          case 'seat': return <g key={i}><rect x={p.x} y={p.y} width={36} height={6} rx={2} fill="currentColor" stroke="none" opacity={0.5} /><line x1={p.x + 18} y1={p.y + 6} x2={p.x + 18} y2={150} /></g>;
          case 'plate': return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={2} fill="currentColor" stroke="none" opacity={0.5} />;
          case 'treadmill': return <g key={i}><rect x={36} y={150} width={132} height={7} rx={3} fill="currentColor" stroke="none" opacity={0.5} /><line x1={160} y1={150} x2={172} y2={92} /><line x1={172} y1={92} x2={150} y2={90} /></g>;
          case 'bike': return <g key={i}><circle cx={56} cy={138} r={12} /><circle cx={148} cy={138} r={12} /><line x1={100} y1={122} x2={56} y2={138} /><line x1={100} y1={122} x2={148} y2={138} /><line x1={100} y1={122} x2={96} y2={88} /><line x1={96} y1={88} x2={148} y2={138} opacity={0.4} /><line x1={150} y1={68} x2={148} y2={138} /><line x1={88} y1={86} x2={104} y2={86} strokeWidth={5} /><line x1={144} y1={68} x2={158} y2={66} strokeWidth={5} /><circle cx={100} cy={122} r={3} fill="currentColor" /><line x1={10} y1={150} x2={190} y2={150} strokeWidth={2} /></g>;
          case 'barbell': { const [x, y] = pose[p.at]; return <g key={i}><line x1={x - 8} y1={y} x2={x + 8} y2={y} strokeWidth={4} /><circle cx={x} cy={y} r={10} fill="currentColor" stroke="none" opacity={0.35} /></g>; }
          case 'dumbbell': { const [x, y] = pose[p.at]; return <g key={i}><rect x={x - 9} y={y - 4} width={18} height={8} rx={2} fill="currentColor" stroke="none" opacity={0.55} /></g>; }
          case 'kettlebell': { const [x, y] = pose[p.at]; return <g key={i}><circle cx={x} cy={y + 9} r={7} fill="currentColor" stroke="none" opacity={0.55} /><path d={`M${x - 4} ${y + 3} q4 -6 8 0`} /></g>; }
          case 'bar': { const [x, y] = pose[p.at]; return <line key={i} x1={x - 22} y1={y} x2={x + 22} y2={y} strokeWidth={4} />; }
          case 'cable': { const [x, y] = pose[p.from]; return <line key={i} x1={x} y1={y} x2={p.to[0]} y2={p.to[1]} strokeWidth={1.5} strokeDasharray="3 3" />; }
          default: return null;
        }
      })}
    </g>
  );
}

export default function ExerciseAnimation({ exercise, compact = false, className }: { exercise: Pick<Exercise, 'name' | 'type' | 'primaryMuscle' | 'instructions' | 'videoUrl'>; compact?: boolean; className?: string }) {
  const pattern = useMemo(() => patternFor(exercise), [exercise]);
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const [t, setT] = useState(0); // reps elapsed (fractional)
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const tempo = (pattern.tempo ?? 3) * (slow ? 2 : 1);
    const tick = (now: number) => {
      if (last.current) setT((v) => v + (now - last.current) / 1000 / tempo);
      last.current = now;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf.current); last.current = 0; };
  }, [playing, slow, pattern]);
  useEffect(() => { setT(0); }, [pattern]);

  const frac = t % 1;
  const p = (1 - Math.cos(frac * Math.PI * 2)) / 2; // 0 → 1 → 0 per rep
  const pose = pattern.poseAt ? pattern.poseAt(frac) : lerp(pattern.a, pattern.b, p);
  const phase = pattern.phases[frac < 0.5 ? 0 : 1];
  const step = exercise.instructions?.length ? Math.floor(t) % exercise.instructions.length : -1;
  const hl = new Set(pattern.highlight.map((s) => s.join('-')));

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-surface-700', className)}>
      <div className={cn('grid', compact ? 'grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]' : 'sm:grid-cols-2')}>
        <div className="relative">
          <svg viewBox="0 0 200 160" className={cn('block w-full text-zinc-900 dark:text-zinc-100', compact ? 'max-h-44' : 'max-h-64')} role="img" aria-label={`${pattern.label} animation: ${phase}`}>
            <Props props={pattern.props} pose={pose} />
            <g strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
              {pattern.segments.map(([a, b]) => {
                const far = a.endsWith('B') || b.endsWith('B');
                const strong = hl.has(`${a}-${b}`);
                return <line key={`${a}-${b}`} x1={pose[a][0]} y1={pose[a][1]} x2={pose[b][0]} y2={pose[b][1]} stroke="currentColor" className={cn(strong && 'text-brand-500 dark:text-brand-400')} opacity={far ? 0.4 : 1} />;
              })}
            </g>
            <circle cx={pose.head[0]} cy={pose.head[1]} r={9} fill="currentColor" />
            {pattern.segments.map(([a, b]) => hl.has(`${a}-${b}`) && <circle key={`j-${a}`} cx={pose[a][0]} cy={pose[a][1]} r={3.5} className="fill-brand-500 dark:fill-brand-400" />)}
          </svg>
          <span className="absolute left-2 top-2 chip bg-zinc-900/80 text-white dark:bg-white/15">{pattern.label}</span>
          <div className="absolute bottom-2 left-2 flex gap-1">
            <button type="button" onClick={() => setPlaying((v) => !v)} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-card dark:bg-surface-600 dark:text-zinc-100" aria-label={playing ? 'Pause animation' : 'Play animation'}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
            <button type="button" onClick={() => setSlow((v) => !v)} className={cn('flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold shadow-card', slow ? 'bg-brand-500 text-white dark:bg-brand-400 dark:text-zinc-950' : 'bg-white/90 text-zinc-900 dark:bg-surface-600 dark:text-zinc-100')} aria-pressed={slow} aria-label="Slow motion"><Gauge className="h-3.5 w-3.5" /> {slow ? '0.5×' : '1×'}</button>
          </div>
        </div>
        <div className={cn('flex flex-col p-3', compact ? 'text-xs' : 'text-sm')}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Current phase</p>
          <p className="mt-0.5 font-extrabold text-brand-600 dark:text-brand-400">{phase}</p>
          {exercise.instructions?.length > 0 && (
            <ol className="mt-2 space-y-1">
              {exercise.instructions.slice(0, compact ? 3 : 6).map((s, i) => (
                <li key={i} className={cn('flex gap-2 rounded-lg px-2 py-1 transition', i === step ? 'bg-brand-500/10 font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-300')}>
                  <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold', i === step ? 'bg-brand-500 text-white dark:bg-brand-400 dark:text-zinc-950' : 'bg-zinc-200 dark:bg-white/10')}>{i + 1}</span>{s}
                </li>
              ))}
            </ol>
          )}
          {exercise.videoUrl && !compact && <a href={exercise.videoUrl} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-bold text-brand-600 hover:underline dark:text-brand-400">Watch a real demo <ExternalLink className="h-3 w-3" /></a>}
        </div>
      </div>
    </div>
  );
}
