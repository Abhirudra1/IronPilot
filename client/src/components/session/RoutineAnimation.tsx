import { useEffect, useMemo, useRef, useState } from 'react';
import { Gauge, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Stick-figure guides for warm-up / cool-down movements. Same 200x160 viewBox and floor-at-150
 * convention as ExerciseAnimation, but a separate pattern vocabulary: mobility drills and stretches
 * need mats, walls and bands rather than barbells and cable stacks, and most are cyclic or held
 * rather than a rep tween.
 */
type Pt = [number, number];
type Pose = Record<string, Pt>;
type Prop =
  | { type: 'floor' } | { type: 'wall' } | { type: 'mat' } | { type: 'treadmill' }
  | { type: 'band'; from: string; to: string } | { type: 'stick'; at: string } | { type: 'bar'; y: number };

interface RPattern {
  label: string;
  phases: [string, string];
  a: Pose; b: Pose;
  segs: [string, string][];
  hl: [string, string][];
  props: Prop[];
  tempo?: number;
  poseAt?: (t: number) => Pose;
}

const SIDE: [string, string][] = [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['ank', 'toe'], ['sh', 'el'], ['el', 'hd']];
const FRONT: [string, string][] = [['neck', 'shL'], ['neck', 'shR'], ['shL', 'hipL'], ['shR', 'hipR'], ['hipL', 'hipR'], ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['hipR', 'kneeR'], ['kneeR', 'ankR'], ['shL', 'elL'], ['elL', 'hdL'], ['shR', 'elR'], ['elR', 'hdR']];
const ARMS: [string, string][] = [['shL', 'elL'], ['elL', 'hdL'], ['shR', 'elR'], ['elR', 'hdR']];
const LEGS: [string, string][] = [['hip', 'knee'], ['knee', 'ank']];

const STAND: Pose = { head: [100, 26], neck: [100, 40], sh: [100, 46], hip: [100, 90], knee: [100, 120], ank: [100, 148], toe: [114, 148], el: [102, 68], hd: [104, 90] };
const FRONT_STAND: Pose = {
  head: [100, 24], neck: [100, 38], shL: [82, 44], shR: [118, 44], hipL: [90, 92], hipR: [110, 92],
  kneeL: [88, 122], kneeR: [112, 122], ankL: [86, 150], ankR: [114, 150], elL: [78, 68], hdL: [76, 92], elR: [122, 68], hdR: [124, 92],
};
const SUPINE: Pose = { head: [46, 128], neck: [60, 130], sh: [66, 130], hip: [110, 132], knee: [134, 110], ank: [156, 132], toe: [168, 130], el: [70, 116], hd: [78, 104] };

/** Hands orbit the shoulders - used by every "circles" drill. */
const orbit = (base: Pose, rL: number, rR: number, t: number, tilt = 0): Pose => {
  const th = t * Math.PI * 2 + tilt;
  return {
    ...base,
    elL: [base.shL[0] - rL * 0.5 * Math.cos(th), base.shL[1] + rL * 0.5 * Math.sin(th) + 14],
    hdL: [base.shL[0] - rL * Math.cos(th), base.shL[1] + rL * Math.sin(th) + 22],
    elR: [base.shR[0] + rR * 0.5 * Math.cos(th), base.shR[1] + rR * 0.5 * Math.sin(th) + 14],
    hdR: [base.shR[0] + rR * Math.cos(th), base.shR[1] + rR * Math.sin(th) + 22],
  };
};

const P: Record<string, RPattern> = {
  walk: {
    label: 'Easy cardio', phases: ['Stride', 'Stride'], tempo: 1.4, props: [{ type: 'treadmill' }],
    segs: [['neck', 'hip'], ['hip', 'kneeF'], ['kneeF', 'ankF'], ['hip', 'kneeB'], ['kneeB', 'ankB'], ['sh', 'elF'], ['elF', 'hdF'], ['sh', 'elB'], ['elB', 'hdB']],
    hl: [['hip', 'kneeF'], ['kneeF', 'ankF']],
    a: { head: [104, 28], neck: [102, 42], sh: [102, 48], hip: [98, 90], kneeF: [116, 116], ankF: [124, 144], kneeB: [86, 116], ankB: [74, 142], elF: [116, 66], hdF: [124, 52], elB: [88, 64], hdB: [82, 82] },
    b: { head: [104, 28], neck: [102, 42], sh: [102, 48], hip: [98, 90], kneeF: [86, 116], ankF: [74, 142], kneeB: [116, 116], ankB: [124, 144], elF: [88, 64], hdF: [82, 82], elB: [116, 66], hdB: [124, 52] },
  },
  armCircle: {
    label: 'Arm circles', phases: ['Circle forward', 'Circle back'], tempo: 2, props: [{ type: 'floor' }],
    segs: FRONT, hl: ARMS, a: FRONT_STAND, b: FRONT_STAND, poseAt: (t) => orbit(FRONT_STAND, 30, 30, t),
  },
  elbowCircle: {
    label: 'Elbow circles', phases: ['Rotate in', 'Rotate out'], tempo: 2, props: [{ type: 'floor' }],
    segs: FRONT, hl: ARMS, a: FRONT_STAND, b: FRONT_STAND, poseAt: (t) => orbit(FRONT_STAND, 16, 16, t),
  },
  wristCircle: {
    label: 'Wrist circles', phases: ['Circle', 'Circle'], tempo: 1.8, props: [{ type: 'floor' }],
    segs: FRONT, hl: ARMS, a: FRONT_STAND, b: FRONT_STAND, poseAt: (t) => orbit({ ...FRONT_STAND, elL: [80, 62], elR: [120, 62] }, 9, 9, t),
  },
  pullApart: {
    label: 'Band pull-apart', phases: ['Pull apart, squeeze', 'Return slowly'], tempo: 2.6,
    props: [{ type: 'floor' }, { type: 'band', from: 'hdL', to: 'hdR' }], segs: FRONT, hl: ARMS,
    a: { ...FRONT_STAND, elL: [88, 52], hdL: [94, 48], elR: [112, 52], hdR: [106, 48] },
    b: { ...FRONT_STAND, elL: [62, 50], hdL: [38, 48], elR: [138, 50], hdR: [162, 48] },
  },
  passThrough: {
    label: 'Pass-through', phases: ['Take it overhead', 'Lower behind you'], tempo: 3,
    props: [{ type: 'floor' }, { type: 'band', from: 'hdL', to: 'hdR' }], segs: FRONT, hl: ARMS,
    a: { ...FRONT_STAND, elL: [70, 66], hdL: [60, 88], elR: [130, 66], hdR: [140, 88] },
    b: { ...FRONT_STAND, elL: [64, 26], hdL: [56, 6], elR: [136, 26], hdR: [144, 6] },
  },
  twist: {
    label: 'Torso twist', phases: ['Rotate left', 'Rotate right'], tempo: 2.4, props: [{ type: 'floor' }], segs: FRONT, hl: [['neck', 'shL'], ['neck', 'shR']],
    a: { ...FRONT_STAND, shL: [70, 46], shR: [110, 42], elL: [60, 66], hdL: [74, 76], elR: [126, 62], hdR: [112, 74] },
    b: { ...FRONT_STAND, shL: [90, 42], shR: [130, 46], elL: [74, 62], hdL: [88, 74], elR: [140, 66], hdR: [126, 76] },
  },
  catCow: {
    label: 'Cat-cow', phases: ['Round the spine', 'Arch and look up'], tempo: 3.4, props: [{ type: 'mat' }],
    segs: [['neck', 'hip'], ['sh', 'el'], ['el', 'hd'], ['hip', 'knee'], ['knee', 'ank']], hl: [['neck', 'hip']],
    a: { head: [52, 92], neck: [66, 92], sh: [70, 92], hip: [128, 92], knee: [132, 120], ank: [148, 132], toe: [156, 132], el: [70, 118], hd: [70, 140] },
    b: { head: [48, 108], neck: [64, 104], sh: [68, 102], hip: [128, 100], knee: [132, 122], ank: [148, 134], toe: [156, 134], el: [70, 120], hd: [70, 140] },
  },
  legSwing: {
    label: 'Leg swings', phases: ['Swing forward', 'Swing back'], tempo: 1.8, props: [{ type: 'floor' }, { type: 'wall' }],
    segs: [['neck', 'hip'], ['hip', 'kneeS'], ['kneeS', 'ankS'], ['hip', 'knee'], ['knee', 'ank'], ['sh', 'el'], ['el', 'hd']], hl: [['hip', 'kneeS'], ['kneeS', 'ankS']],
    a: { head: [100, 26], neck: [100, 40], sh: [100, 46], hip: [100, 90], knee: [100, 120], ank: [100, 148], toe: [112, 148], kneeS: [124, 104], ankS: [140, 122], el: [112, 62], hd: [126, 58] },
    b: { head: [100, 26], neck: [100, 40], sh: [100, 46], hip: [100, 90], knee: [100, 120], ank: [100, 148], toe: [112, 148], kneeS: [78, 112], ankS: [60, 128], el: [112, 62], hd: [126, 58] },
  },
  hipCircle: {
    label: 'Hip circles', phases: ['Circle out', 'Circle in'], tempo: 2.6, props: [{ type: 'floor' }],
    segs: SIDE, hl: LEGS, a: STAND, b: STAND,
    poseAt: (t) => {
      const th = t * Math.PI * 2; const hip: Pt = [100, 90];
      const knee: Pt = [hip[0] + 22 + 12 * Math.cos(th), hip[1] + 18 + 10 * Math.sin(th)];
      return { ...STAND, hip, knee, ank: [knee[0] + 4, knee[1] + 26], toe: [knee[0] + 16, knee[1] + 26], el: [112, 64], hd: [124, 60] };
    },
  },
  ankleCircle: {
    label: 'Ankle circles', phases: ['Circle', 'Rock heel to toe'], tempo: 2, props: [{ type: 'floor' }],
    segs: SIDE, hl: [['knee', 'ank'], ['ank', 'toe']], a: STAND, b: STAND,
    poseAt: (t) => {
      const th = t * Math.PI * 2;
      const ank: Pt = [104 + 7 * Math.cos(th), 134 + 6 * Math.sin(th)];
      return { ...STAND, knee: [102, 116], ank, toe: [ank[0] + 14, ank[1] + 6], el: [112, 64], hd: [124, 60] };
    },
  },
  squat: {
    label: 'Bodyweight squat', phases: ['Sit back and down', 'Drive up'], tempo: 2.6, props: [{ type: 'floor' }], segs: SIDE, hl: LEGS,
    a: { ...STAND, el: [108, 62], hd: [122, 58] },
    b: { head: [98, 54], neck: [98, 68], sh: [98, 74], hip: [90, 110], knee: [114, 126], ank: [104, 148], toe: [118, 148], el: [110, 78], hd: [126, 74] },
  },
  wallSit: {
    label: 'Wall sit', phases: ['Hold, breathe', 'Hold, breathe'], tempo: 5, props: [{ type: 'floor' }, { type: 'wall' }], segs: SIDE, hl: LEGS,
    a: { head: [80, 62], neck: [80, 76], sh: [80, 82], hip: [82, 112], knee: [122, 112], ank: [122, 148], toe: [134, 148], el: [94, 96], hd: [108, 108] },
    b: { head: [80, 60], neck: [80, 74], sh: [80, 80], hip: [82, 110], knee: [122, 110], ank: [122, 148], toe: [134, 148], el: [94, 94], hd: [108, 106] },
  },
  bridge: {
    label: 'Glute bridge', phases: ['Drive hips up, squeeze', 'Lower slowly'], tempo: 2.8, props: [{ type: 'mat' }],
    segs: [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['sh', 'el'], ['el', 'hd']], hl: [['neck', 'hip'], ['hip', 'knee']],
    a: { head: [46, 132], neck: [60, 134], sh: [66, 134], hip: [110, 136], knee: [136, 112], ank: [140, 140], toe: [150, 140], el: [76, 140], hd: [92, 142] },
    b: { head: [46, 132], neck: [60, 132], sh: [66, 130], hip: [112, 108], knee: [138, 110], ank: [140, 140], toe: [150, 140], el: [76, 140], hd: [92, 142] },
  },
  deadBug: {
    label: 'Dead bug', phases: ['Extend opposite arm and leg', 'Return, keep back flat'], tempo: 3.2, props: [{ type: 'mat' }],
    segs: [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['sh', 'el'], ['el', 'hd']], hl: [['neck', 'hip']],
    a: { ...SUPINE, knee: [128, 106], ank: [130, 132], el: [72, 106], hd: [84, 96] },
    b: { ...SUPINE, knee: [142, 118], ank: [172, 126], el: [56, 110], hd: [34, 106] },
  },
  scapPull: {
    label: 'Scapular pull', phases: ['Pull shoulder blades down', 'Relax into the hang'], tempo: 2.8, props: [{ type: 'bar', y: 22 }],
    segs: [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['sh', 'el'], ['el', 'hd']], hl: [['sh', 'el'], ['el', 'hd']],
    a: { head: [100, 44], neck: [100, 58], sh: [100, 64], hip: [100, 104], knee: [100, 128], ank: [104, 148], toe: [116, 148], el: [100, 44], hd: [100, 24] },
    b: { head: [100, 36], neck: [100, 50], sh: [100, 56], hip: [100, 98], knee: [100, 124], ank: [104, 146], toe: [116, 146], el: [100, 40], hd: [100, 24] },
  },
  wgs: {
    label: "World's greatest stretch", phases: ['Lunge, elbow to the floor', 'Rotate the top arm up'], tempo: 4, props: [{ type: 'floor' }],
    segs: [['neck', 'hip'], ['hip', 'kneeF'], ['kneeF', 'ankF'], ['hip', 'kneeB'], ['kneeB', 'ankB'], ['sh', 'el'], ['el', 'hd']], hl: [['sh', 'el'], ['el', 'hd']],
    a: { head: [92, 82], neck: [92, 96], sh: [92, 100], hip: [78, 118], kneeF: [112, 118], ankF: [116, 146], kneeB: [54, 138], ankB: [30, 148], el: [100, 122], hd: [104, 146] },
    b: { head: [98, 74], neck: [96, 88], sh: [96, 94], hip: [78, 118], kneeF: [112, 118], ankF: [116, 146], kneeB: [54, 138], ankB: [30, 148], el: [110, 70], hd: [124, 44] },
  },
  doorway: {
    label: 'Doorway chest stretch', phases: ['Turn away, feel the stretch', 'Ease off slightly'], tempo: 5, props: [{ type: 'floor' }, { type: 'wall' }], segs: SIDE, hl: [['sh', 'el'], ['el', 'hd']],
    a: { ...STAND, head: [96, 26], sh: [98, 46], el: [118, 48], hd: [136, 40] },
    b: { ...STAND, head: [92, 26], neck: [96, 40], sh: [94, 46], el: [120, 46], hd: [140, 36] },
  },
  crossBody: {
    label: 'Cross-body stretch', phases: ['Draw the arm across', 'Hold and breathe'], tempo: 5, props: [{ type: 'floor' }], segs: FRONT, hl: [['shL', 'elL'], ['elL', 'hdL']],
    a: { ...FRONT_STAND, elL: [104, 50], hdL: [124, 52], elR: [116, 56], hdR: [104, 50] },
    b: { ...FRONT_STAND, elL: [112, 50], hdL: [134, 52], elR: [118, 54], hdR: [106, 50] },
  },
  triStretch: {
    label: 'Overhead triceps stretch', phases: ['Ease the elbow back', 'Hold and breathe'], tempo: 5, props: [{ type: 'floor' }], segs: FRONT, hl: [['shL', 'elL'], ['elL', 'hdL']],
    a: { ...FRONT_STAND, elL: [90, 18], hdL: [100, 40], elR: [112, 30], hdR: [96, 20] },
    b: { ...FRONT_STAND, elL: [96, 16], hdL: [104, 46], elR: [114, 28], hdR: [100, 18] },
  },
  quadStretch: {
    label: 'Standing quad stretch', phases: ['Heel to your backside', 'Push the hip forward'], tempo: 5, props: [{ type: 'floor' }],
    segs: [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['hip', 'kneeS'], ['kneeS', 'ankS'], ['sh', 'el'], ['el', 'hd']], hl: [['hip', 'kneeS'], ['kneeS', 'ankS']],
    a: { head: [100, 26], neck: [100, 40], sh: [100, 46], hip: [100, 90], knee: [100, 120], ank: [100, 148], toe: [112, 148], kneeS: [102, 118], ankS: [86, 98], el: [98, 68], hd: [90, 94] },
    b: { head: [100, 24], neck: [100, 38], sh: [100, 44], hip: [102, 88], knee: [100, 118], ank: [100, 148], toe: [112, 148], kneeS: [106, 116], ankS: [88, 92], el: [100, 66], hd: [92, 88] },
  },
  hamStretch: {
    label: 'Seated hamstring stretch', phases: ['Hinge from the hips', 'Flat back, breathe out'], tempo: 5, props: [{ type: 'mat' }],
    segs: [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['sh', 'el'], ['el', 'hd']], hl: [['hip', 'knee'], ['knee', 'ank']],
    a: { head: [74, 84], neck: [76, 98], sh: [78, 102], hip: [72, 134], knee: [116, 136], ank: [154, 136], toe: [154, 124], el: [98, 112], hd: [118, 122] },
    b: { head: [96, 100], neck: [92, 112], sh: [90, 116], hip: [72, 134], knee: [116, 136], ank: [154, 136], toe: [154, 124], el: [116, 122], hd: [140, 130] },
  },
  figure4: {
    label: 'Figure-4 stretch', phases: ['Pull the thigh in', 'Hold and breathe'], tempo: 5, props: [{ type: 'mat' }],
    segs: [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['hip', 'kneeC'], ['kneeC', 'ankC'], ['sh', 'el'], ['el', 'hd']], hl: [['hip', 'kneeC'], ['kneeC', 'ankC']],
    a: { head: [44, 128], neck: [58, 130], sh: [64, 130], hip: [108, 132], knee: [128, 108], ank: [132, 136], toe: [142, 136], 'kneeC': [112, 104], 'ankC': [140, 112], el: [78, 118], hd: [100, 112] },
    b: { head: [44, 128], neck: [58, 130], sh: [64, 130], hip: [108, 132], knee: [120, 98], ank: [126, 126], toe: [136, 126], 'kneeC': [104, 96], 'ankC': [134, 102], el: [76, 112], hd: [96, 102] },
  },
  calfStretch: {
    label: 'Wall calf stretch', phases: ['Drive the back heel down', 'Hold and breathe'], tempo: 5, props: [{ type: 'floor' }, { type: 'wall' }],
    segs: [['neck', 'hip'], ['hip', 'kneeF'], ['kneeF', 'ankF'], ['hip', 'kneeB'], ['kneeB', 'ankB'], ['sh', 'el'], ['el', 'hd']], hl: [['kneeB', 'ankB']],
    a: { head: [96, 44], neck: [96, 58], sh: [96, 64], hip: [92, 100], kneeF: [70, 122], ankF: [60, 148], kneeB: [120, 122], ankB: [142, 148], el: [76, 62], hd: [56, 56] },
    b: { head: [92, 46], neck: [92, 60], sh: [92, 66], hip: [88, 102], kneeF: [66, 124], ankF: [58, 148], kneeB: [122, 124], ankB: [148, 148], el: [72, 62], hd: [52, 56] },
  },
  childPose: {
    label: "Child's pose", phases: ['Sit back on the heels', 'Reach further away'], tempo: 5, props: [{ type: 'mat' }],
    segs: [['neck', 'hip'], ['sh', 'el'], ['el', 'hd'], ['hip', 'knee'], ['knee', 'ank']], hl: [['neck', 'hip'], ['sh', 'el']],
    a: { head: [74, 118], neck: [88, 122], sh: [92, 124], hip: [134, 128], knee: [136, 140], ank: [120, 142], toe: [112, 142], el: [58, 130], hd: [38, 136] },
    b: { head: [66, 124], neck: [82, 126], sh: [86, 128], hip: [134, 130], knee: [136, 142], ank: [120, 144], toe: [112, 144], el: [46, 134], hd: [22, 138] },
  },
  cobra: {
    label: 'Cobra', phases: ['Press the chest up', 'Lower with control'], tempo: 4, props: [{ type: 'mat' }],
    segs: [['neck', 'hip'], ['sh', 'el'], ['el', 'hd'], ['hip', 'knee'], ['knee', 'ank']], hl: [['neck', 'hip']],
    a: { head: [46, 128], neck: [60, 132], sh: [64, 134], hip: [112, 140], knee: [140, 142], ank: [164, 142], toe: [172, 138], el: [62, 140], hd: [66, 146] },
    b: { head: [40, 98], neck: [56, 108], sh: [62, 112], hip: [112, 140], knee: [140, 142], ank: [164, 142], toe: [172, 138], el: [60, 128], hd: [64, 146] },
  },
  forwardFold: {
    label: 'Forward fold', phases: ['Fold from the hips', 'Let the head hang'], tempo: 5, props: [{ type: 'floor' }], segs: SIDE, hl: [['hip', 'knee'], ['neck', 'hip']],
    a: { head: [112, 70], neck: [106, 82], sh: [104, 86], hip: [96, 104], knee: [98, 126], ank: [100, 148], toe: [112, 148], el: [108, 108], hd: [110, 130] },
    b: { head: [118, 92], neck: [110, 100], sh: [108, 102], hip: [96, 106], knee: [98, 126], ank: [100, 148], toe: [112, 148], el: [114, 122], hd: [116, 144] },
  },
  breathe: {
    label: 'Slow breathing', phases: ['Breathe in through the nose', 'Out through the mouth'], tempo: 6, props: [{ type: 'mat' }],
    segs: [['neck', 'hip'], ['hip', 'knee'], ['knee', 'ank'], ['sh', 'el'], ['el', 'hd']], hl: [['neck', 'hip']],
    a: { head: [46, 130], neck: [60, 132], sh: [66, 132], hip: [112, 134], knee: [136, 112], ank: [158, 134], toe: [168, 132], el: [78, 142], hd: [96, 142] },
    b: { head: [46, 126], neck: [60, 128], sh: [66, 126], hip: [112, 130], knee: [136, 108], ank: [158, 132], toe: [168, 130], el: [78, 140], hd: [96, 140] },
  },
  overheadExt: {
    label: 'Overhead extension', phases: ['Straighten the elbow', 'Bend behind the head'], tempo: 2.4, props: [{ type: 'floor' }], segs: FRONT, hl: ARMS,
    a: { ...FRONT_STAND, elL: [90, 20], hdL: [100, 42], elR: [110, 20], hdR: [100, 42] },
    b: { ...FRONT_STAND, elL: [92, 18], hdL: [96, 0], elR: [108, 18], hdR: [104, 0] },
  },
  facePull: {
    label: 'Face pull', phases: ['Pull to the forehead', 'Extend with control'], tempo: 2.6,
    props: [{ type: 'floor' }, { type: 'band', from: 'hdL', to: 'hdR' }], segs: FRONT, hl: ARMS,
    a: { ...FRONT_STAND, elL: [76, 40], hdL: [86, 34], elR: [124, 40], hdR: [114, 34] },
    b: { ...FRONT_STAND, elL: [56, 30], hdL: [80, 26], elR: [144, 30], hdR: [120, 26] },
  },
  calfRaise: {
    label: 'Calf raise', phases: ['Rise onto the toes', 'Lower the heels slowly'], tempo: 2.4, props: [{ type: 'floor' }], segs: SIDE, hl: [['knee', 'ank'], ['ank', 'toe']],
    a: STAND,
    b: { head: [100, 16], neck: [100, 30], sh: [100, 36], hip: [100, 80], knee: [100, 110], ank: [100, 136], toe: [114, 148], el: [102, 58], hd: [104, 80] },
  },
  curl: {
    label: 'Band curl', phases: ['Curl up', 'Lower slowly'], tempo: 2.4, props: [{ type: 'floor' }, { type: 'band', from: 'hdL', to: 'ankL' }], segs: FRONT, hl: ARMS,
    a: { ...FRONT_STAND, elL: [80, 68], hdL: [80, 92], elR: [120, 68], hdR: [120, 92] },
    b: { ...FRONT_STAND, elL: [80, 68], hdL: [86, 48], elR: [120, 68], hdR: [114, 48] },
  },
  pushdown: {
    label: 'Band pushdown', phases: ['Push down, squeeze', 'Return to 90 degrees'], tempo: 2.4, props: [{ type: 'floor' }], segs: FRONT, hl: ARMS,
    a: { ...FRONT_STAND, elL: [82, 66], hdL: [88, 46], elR: [118, 66], hdR: [112, 46] },
    b: { ...FRONT_STAND, elL: [82, 66], hdL: [84, 94], elR: [118, 66], hdR: [116, 94] },
  },
  generic: {
    label: 'Controlled movement', phases: ['Work', 'Return'], tempo: 3, props: [{ type: 'floor' }], segs: SIDE, hl: [],
    a: STAND, b: { ...STAND, head: [100, 23], neck: [100, 37], sh: [100, 43], hip: [100, 88], el: [104, 64], hd: [110, 84] },
  },
};

/** Match a routine step by name. Order matters: the most specific phrases first. */
export function patternForStep(name: string): RPattern {
  const n = name.toLowerCase();
  const has = (...k: string[]) => k.some((s) => n.includes(s));
  if (has('breathing')) return P.breathe;
  // "Forward fold, quad and chest stretch" also contains "chest stretch", so it has to win first.
  if (has('forward fold')) return P.forwardFold;
  if (has('face pull')) return P.facePull;
  if (has('elbow extension') || (has('overhead') && has('extension'))) return P.overheadExt;
  if (has('calf raise')) return P.calfRaise;
  if (has('pull-apart', 'pull apart')) return P.pullApart;
  if (has('pass-through', 'pass through')) return P.passThrough;
  if (has('arm circle')) return P.armCircle;
  if (has('elbow circle')) return P.elbowCircle;
  if (has('wrist circle')) return P.wristCircle;
  if (has('ankle circle', 'ankle rock')) return P.ankleCircle;
  if (has('hip circle')) return P.hipCircle;
  if (has('leg swing')) return P.legSwing;
  if (has('torso twist')) return P.twist;
  if (has('cat-cow', 'cat cow')) return P.catCow;
  if (has("world's greatest", 'worlds greatest')) return P.wgs;
  if (has('dead bug')) return P.deadBug;
  if (has('wall sit')) return P.wallSit;
  if (has('glute bridge', 'clamshell')) return P.bridge;
  if (has('scapular')) return P.scapPull;
  if (has('doorway', 'chest stretch')) return P.doorway;
  if (has('cross-body', 'cross body')) return P.crossBody;
  if (has('triceps stretch') || (has('overhead') && has('stretch'))) return P.triStretch;
  if (has('quad stretch')) return P.quadStretch;
  if (has('hamstring stretch')) return P.hamStretch;
  if (has('figure-4', 'figure 4', 'pigeon')) return P.figure4;
  if (has('calf stretch')) return P.calfStretch;
  if (has("child's pose", 'childs pose')) return P.childPose;
  if (has('cobra', 'lying twist')) return P.cobra;
  if (has('squat')) return P.squat;
  // Stretch and cardio catch-alls, after the specific ones above.
  if (has('cardio', 'walk', 'cycle', 'cycling', 'rowing', 'pace build', 'treadmill')) return P.walk;
  if (has('flexor', 'extensor', 'stretch')) return P.forwardFold;
  if (has('pushdown')) return P.pushdown;
  if (has('curl')) return P.curl;
  return P.generic;
}

const lerp = (a: Pose, b: Pose, p: number): Pose =>
  Object.fromEntries(Object.keys(a).map((k) => [k, [a[k][0] + (b[k][0] - a[k][0]) * p, a[k][1] + (b[k][1] - a[k][1]) * p] as Pt]));

function Scenery({ props, pose }: { props: Prop[]; pose: Pose }) {
  return (
    <g className="text-zinc-400 dark:text-zinc-500" stroke="currentColor" fill="none" strokeWidth={3} strokeLinecap="round">
      {props.map((p, i) => {
        switch (p.type) {
          case 'floor': return <line key={i} x1={10} y1={150} x2={190} y2={150} strokeWidth={2} />;
          case 'mat': return <g key={i}><rect x={16} y={146} width={168} height={7} rx={3} fill="currentColor" stroke="none" opacity={0.35} /><line x1={10} y1={153} x2={190} y2={153} strokeWidth={2} /></g>;
          case 'wall': return <g key={i}><line x1={172} y1={8} x2={172} y2={150} strokeWidth={4} opacity={0.6} /><line x1={10} y1={150} x2={190} y2={150} strokeWidth={2} /></g>;
          case 'bar': return <line key={i} x1={54} y1={p.y} x2={146} y2={p.y} strokeWidth={4} />;
          case 'treadmill': return <g key={i}><rect x={36} y={150} width={132} height={7} rx={3} fill="currentColor" stroke="none" opacity={0.5} /><line x1={160} y1={150} x2={172} y2={92} /><line x1={172} y1={92} x2={150} y2={90} /></g>;
          case 'band': { const a = pose[p.from]; const b = pose[p.to]; if (!a || !b) return null; const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 6]; return <path key={i} d={`M${a[0]} ${a[1]} Q${mid[0]} ${mid[1]} ${b[0]} ${b[1]}`} strokeWidth={2.5} className="text-brand-500 dark:text-brand-400" />; }
          case 'stick': { const [x, y] = pose[p.at]; return <line key={i} x1={x - 24} y1={y} x2={x + 24} y2={y} strokeWidth={4} />; }
          default: return null;
        }
      })}
    </g>
  );
}

/** Looping figure for one warm-up / cool-down step. */
export default function RoutineAnimation({ name, className }: { name: string; className?: string }) {
  const pattern = useMemo(() => patternForStep(name), [name]);
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const [t, setT] = useState(0);
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
  const p = (1 - Math.cos(frac * Math.PI * 2)) / 2;
  const pose = pattern.poseAt ? pattern.poseAt(frac) : lerp(pattern.a, pattern.b, p);
  const phase = pattern.phases[frac < 0.5 ? 0 : 1];
  const hl = new Set(pattern.hl.map((s) => s.join('-')));

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-surface-700', className)}>
      <svg viewBox="0 0 200 160" className="block max-h-60 w-full text-zinc-900 dark:text-zinc-100" role="img" aria-label={`${pattern.label}: ${phase}`}>
        <Scenery props={pattern.props} pose={pose} />
        <g strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
          {pattern.segs.map(([a, b]) => {
            if (!pose[a] || !pose[b]) return null;
            const strong = hl.has(`${a}-${b}`);
            return <line key={`${a}-${b}`} x1={pose[a][0]} y1={pose[a][1]} x2={pose[b][0]} y2={pose[b][1]} stroke="currentColor" className={cn(strong && 'text-brand-500 dark:text-brand-400')} />;
          })}
        </g>
        <circle cx={pose.head[0]} cy={pose.head[1]} r={9} fill="currentColor" />
      </svg>
      <span className="chip absolute left-2 top-2 bg-zinc-900/80 text-white dark:bg-white/15">{pattern.label}</span>
      <p className="absolute bottom-2 right-3 text-right text-xs font-bold text-brand-600 dark:text-brand-400">{phase}</p>
      <div className="absolute bottom-2 left-2 flex gap-1">
        <button type="button" onClick={() => setPlaying((v) => !v)} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-card dark:bg-surface-600 dark:text-zinc-100" aria-label={playing ? 'Pause animation' : 'Play animation'}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => setSlow((v) => !v)} aria-pressed={slow} aria-label="Slow motion" className={cn('flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold shadow-card', slow ? 'bg-brand-500 text-white dark:bg-brand-400 dark:text-zinc-950' : 'bg-white/90 text-zinc-900 dark:bg-surface-600 dark:text-zinc-100')}>
          <Gauge className="h-3.5 w-3.5" /> {slow ? '0.5×' : '1×'}
        </button>
      </div>
    </div>
  );
}
