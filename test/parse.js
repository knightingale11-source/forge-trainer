global.window = { }; global.localStorage = { getItem: () => null, setItem() {} }; global.document = { createElementNS: () => ({ setAttribute() {}, appendChild() {} }) };
const fs = require('fs');
eval(['exercises','rig','state','coach'].map(f => fs.readFileSync('src/' + f + '.js', 'utf8')).join('\n') + ';global.EX=EX;global.Lib=Lib;global.Store=Store;global.Coach=Coach;global.Sched=Sched;global.Dates=Dates;global.Log=Log;global.Gen=Gen;global.Stats=Stats;');
const ctx = { today: '2026-10-27' };
const cmds = [
 "Change Monday to chest and biceps.", "Give me five chest exercises instead of four.", "Replace flat barbell bench press with dumbbell bench press.",
 "Change all triceps exercises to 12 reps.", "Make tomorrow a leg day.", "Add calves to my leg workout.", "Change the programme to a five-day split.",
 "Make all exercises four sets of eight reps.", "Remove deadlifts from my programme.", "Put my compound exercises before my isolation exercises.",
 "Switch this week to dumbbells.", "Add 20 minutes of StairMaster to every workout.", "Change my abs routine to three exercises.", "Make Fridays recovery days.",
 "Give me more upper-chest exercises.", "Replace this exercise with something that targets the same muscle.", "Rebuild the programme with an emphasis on shoulder growth.",
 "From next Monday, change to a five-day split, increase shoulders to five exercises and make cardio 30 minutes every session.",
 "increase bench press to 85 kg", "make rest 2 minutes", "3 sets of 12 on lateral raises", "add hammer curls to today", "do cardio before lifting", "remove cardio", "make the 3rd a rest day",
];
for (const c of cmds) { const r = Coach.parse(c, { ...ctx, exerciseId: 'bb_bench_flat' }); console.log('\n> ' + c); console.log('  scope=' + r.scope + (r.date ? ' date=' + r.date : ''), JSON.stringify(r.ops)); if (r.unknown.length) console.log('  UNKNOWN:', r.unknown); if (r.ops.length) console.log('  preview:', Coach.preview(r.ops, r.scope === 'today' ? 'today' : r.scope === 'date' ? 'date' : 'program', { ...ctx, date: r.date })); }
console.log('\nSchedule check:'); for (let i=0;i<8;i++){const d=Dates.addDays('2026-10-26',i); const r=Sched.resolve(d); console.log(d, r.kind, r.name||r.reason||'', r.emphasis);}
const w = Log.ensure('2026-10-26'); console.log('workout entries:', w.entries.map(e=>e.ex+':'+e.sets.length).join(', '), 'core:', w.core.map(e=>e.ex).join(','), 'cardio:', w.cardio && w.cardio.activity);
