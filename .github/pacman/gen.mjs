// Draws the GitHub contribution calendar as GitHub renders it and plays a game of Pac-Man
// on it: the non-empty days are the dots, the brightest ones are power pellets, and the
// ghosts leave their house and hunt with their arcade targeting rules. The game is
// simulated once and recorded as CSS animations. Writes a light and a dark SVG.
import fs from 'fs';
import path from 'path';

const username = process.env.GH_USERNAME;
const outDir = process.env.OUT_DIR ?? '.';
// A personal token also counts private contributions; the Actions token is the fallback
// for when it is missing, expired or revoked.
const tokens = [process.env.GITHUB_TOKEN, process.env.FALLBACK_TOKEN].filter(Boolean);
if (!username || !tokens.length) throw new Error('GH_USERNAME and GITHUB_TOKEN are required');

// Geometry of GitHub's profile calendar. The left margin stands in for the weekday label
// column, so the grid lines up with the real calendar further down the profile.
const CELL = 10;
const GAP = 2.25;
const PITCH = CELL + GAP;
const LEFT = 40;
const PAD = 2;
const ROWS = 7;
const THEMES = {
	'pacman-contribution-graph.svg': {
		id: 'l',
		levels: ['#eff2f5', '#aceebb', '#4ac26b', '#2da44e', '#116329'],
		border: '#1f23280d'
	},
	'pacman-contribution-graph-dark.svg': {
		id: 'd',
		levels: ['#151b23', '#033a16', '#196c2e', '#2ea043', '#56d364'],
		border: '#0104090d'
	}
};
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const STEP_MS = 180;
const MAX_STEPS = 2000;
const READY_STEPS = 6;
const FRIGHT_STEPS = 34;
const FLASH_STEPS = 10;
// Level 1 scatter/chase schedule (7s, 20s, 7s, 20s, 5s, 20s, 5s, then chase) in steps.
const MODE_SCHEDULE = [39, 111, 39, 111, 28, 111, 28, Infinity];

const DIRS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
// The arcade breaks ties between equally good turns in this order.
const ORDER = ['up', 'left', 'down', 'right'];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const ANGLE = { right: 0, down: 90, left: 180, up: 270 };

const fetchCalendar = async () => {
	const query = `query($login: String!) { user(login: $login) { contributionsCollection {
		contributionCalendar { weeks { contributionDays { weekday contributionLevel } } } } } }`;
	let lastError;
	for (const token of tokens) {
		const res = await fetch('https://api.github.com/graphql', {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ query, variables: { login: username } })
		});
		const body = res.ok ? await res.json() : null;
		const calendar = body?.data?.user?.contributionsCollection?.contributionCalendar;
		if (calendar) return calendar;
		lastError = `GraphQL request failed: ${res.status} ${JSON.stringify(body?.errors ?? '')}`;
		console.log(`${lastError}, trying the next token`);
	}
	throw new Error(lastError);
};

// Deterministic, so the same calendar always produces the same game.
const random = (() => {
	let a = 1;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
})();

const key = (p) => `${p.x},${p.y}`;
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const step = (p, dir, n = 1) => ({ x: p.x + DIRS[dir][0] * n, y: p.y + DIRS[dir][1] * n });

// Up to four power pellets among the brightest days, spread as far apart as possible.
const pickPellets = (cells) => {
	const bright = cells.filter((c) => c.level >= 3).sort((a, b) => b.level - a.level || a.x - b.x);
	const picked = bright.length ? [bright[0]] : [];
	while (picked.length < 4 && picked.length < bright.length) {
		let best = null;
		let bestD = -1;
		for (const c of bright) {
			if (picked.includes(c)) continue;
			const d = Math.min(...picked.map((p) => manhattan(p, c)));
			if (d > bestD) [best, bestD] = [c, d];
		}
		picked.push(best);
	}
	return new Set(picked.map(key));
};

const simulate = (cells, cols) => {
	const inside = (p) => p.x >= 0 && p.x < cols && p.y >= 0 && p.y < ROWS;
	const dots = new Map(cells.filter((c) => c.level > 0).map((c) => [key(c), c]));
	const totalDots = dots.size;
	const pellets = pickPellets(cells);
	const eatenAt = new Map();

	const hx = Math.floor(cols / 2);
	const door = { x: hx, y: 2 };
	const home = { x: hx, y: 3 };
	const pacStart = { x: hx, y: 5 };
	const pac = { ...pacStart, dir: 'left' };
	const ghosts = [
		{ name: 'blinky', color: '#ff0000', start: door, corner: { x: cols + 2, y: -3 }, dotLimit: 0 },
		{ name: 'pinky', color: '#ffb8ff', start: home, corner: { x: -3, y: -3 }, dotLimit: 0 },
		{ name: 'inky', color: '#00ffff', start: { x: hx - 1, y: 3 }, corner: { x: cols + 2, y: ROWS + 2 }, dotLimit: 0.1 },
		{ name: 'clyde', color: '#ffb852', start: { x: hx + 1, y: 3 }, corner: { x: -3, y: ROWS + 2 }, dotLimit: 0.25 }
	];

	let modeIndex = 0;
	let modeLeft = MODE_SCHEDULE[0];
	const scatter = () => modeIndex % 2 === 0;
	let dotsEaten = 0;
	let sinceDot = 0;
	let lostLife = false;
	let lifeSteps = 0;

	const resetActors = () => {
		Object.assign(pac, pacStart, { dir: 'left' });
		for (const g of ghosts) {
			Object.assign(g, g.start, { dir: 'left', fright: 0, draw: { ...g.start } });
			g.mode = g.name === 'blinky' ? 'active' : 'house';
		}
		modeIndex = 0;
		modeLeft = MODE_SCHEDULE[0];
		lifeSteps = 0;
	};
	resetActors();

	const frames = [];
	const record = (opts = {}) => {
		const t = frames.length;
		frames.push({
			pac: { x: pac.x, y: pac.y, dir: pac.dir, scale: opts.pacScale ?? 1, visible: opts.pacVisible ?? true },
			ghosts: ghosts.map((g) => {
				const bob = g.mode === 'house' ? (Math.floor(t / 2) % 2 ? -0.3 : 0.3) : 0;
				const flashing = g.fright > 0 && g.fright <= FLASH_STEPS && t % 2 === 0;
				return {
					x: g.draw.x,
					y: g.draw.y + bob,
					dir: g.dir,
					visible: opts.ghostsVisible ?? true,
					look: g.mode === 'eyes' ? 'eyes' : g.fright > 0 ? (flashing ? 'white' : 'blue') : 'normal'
				};
			})
		});
	};

	const eat = (t) => {
		const k = key(pac);
		if (!dots.has(k)) return;
		dots.delete(k);
		eatenAt.set(k, t);
		dotsEaten++;
		sinceDot = 0;
		if (pellets.has(k)) {
			for (const g of ghosts) {
				if (g.mode !== 'active') continue;
				g.fright = FRIGHT_STEPS;
				g.dir = OPPOSITE[g.dir];
			}
		}
	};

	const target = (g) => {
		if (g.mode === 'eyes') return door;
		if (scatter()) return g.corner;
		switch (g.name) {
			case 'blinky':
				return pac;
			case 'pinky':
				return step(pac, pac.dir, 4);
			case 'inky': {
				const pivot = step(pac, pac.dir, 2);
				const blinky = ghosts[0];
				return { x: 2 * pivot.x - blinky.x, y: 2 * pivot.y - blinky.y };
			}
			default:
				return manhattan(g, pac) > 8 ? pac : g.corner;
		}
	};

	// Frightened ghosts move at half speed, drawn halfway through their move on the
	// first step so the motion stays smooth.
	const moveGhost = (g, t) => {
		const from = { x: g.x, y: g.y };
		if (g.mode === 'house') {
			const released = lostLife ? lifeSteps > { pinky: 2, inky: 14, clyde: 28 }[g.name] : dotsEaten >= g.dotLimit * totalDots || sinceDot > 30;
			if (released) g.mode = 'exit';
			g.draw = { ...from };
			return;
		}
		if (g.mode === 'exit') {
			if (g.x !== home.x) g.dir = g.x < home.x ? 'right' : 'left';
			else g.dir = 'up';
			Object.assign(g, step(g, g.dir));
			if (g.x === door.x && g.y === door.y) {
				g.mode = 'active';
				g.dir = 'left';
			}
			g.draw = { x: g.x, y: g.y };
			return;
		}
		if (g.mode === 'eyes' && g.x === door.x && g.y === door.y) {
			Object.assign(g, home, { mode: 'exit', fright: 0 });
			g.draw = { ...home };
			return;
		}
		if (g.fright > 0 && t % 2) {
			g.draw = { x: g.x, y: g.y };
			return;
		}
		let options = ORDER.filter((d) => d !== OPPOSITE[g.dir] && inside(step(g, d)));
		if (!options.length) options = [OPPOSITE[g.dir]];
		if (g.fright > 0) {
			g.dir = options[Math.floor(random() * options.length)];
		} else {
			const goal = target(g);
			g.dir = options.reduce((best, d) => (dist2(step(g, d), goal) < dist2(step(g, best), goal) ? d : best));
		}
		Object.assign(g, step(g, g.dir));
		g.draw = g.fright > 0 ? { x: (from.x + g.x) / 2, y: (from.y + g.y) / 2 } : { x: g.x, y: g.y };
	};

	// Pac-Man takes the shortest route to a dot (or to a frightened ghost worth chasing)
	// along which he reaches every cell before any dangerous ghost could, and flees
	// towards the safest cell when no such route exists.
	const movePac = () => {
		const danger = ghosts.filter((g) => g.mode !== 'eyes' && g.fright === 0);
		const ghostTime = (p) =>
			Math.min(
				Infinity,
				...danger.map((g) => (g.mode === 'active' ? manhattan(g, p) : manhattan(g, door) + manhattan(door, p) + 1))
			);
		const prey = new Set(
			ghosts.filter((g) => g.mode === 'active' && g.fright > manhattan(g, pac) + 2 && manhattan(g, pac) < 8).map(key)
		);
		const isGoal = (p, t) => (prey.size ? prey.has(key(p)) : dots.has(key(p)) && ghostTime(p) - t >= 2);

		const seen = new Set([key(pac)]);
		let queue = ORDER.map((d) => ({ p: step(pac, d), first: d }))
			.filter(({ p }) => inside(p))
			.sort((a, b) => (a.first === pac.dir ? -1 : b.first === pac.dir ? 1 : 0));
		let choice = null;
		for (let t = 1; queue.length && !choice; t++) {
			const next = [];
			for (const n of queue) {
				const k = key(n.p);
				if (seen.has(k) || ghostTime(n.p) <= t) continue;
				seen.add(k);
				if (isGoal(n.p, t)) {
					choice = n.first;
					break;
				}
				for (const d of ORDER) {
					const p = step(n.p, d);
					if (inside(p)) next.push({ p, first: n.first });
				}
			}
			queue = next;
		}
		if (!choice) {
			let bestTime = -1;
			for (const d of ORDER) {
				const p = step(pac, d);
				if (!inside(p)) continue;
				const gt = ghostTime(p) + (d === pac.dir ? 0.1 : 0);
				if (gt > bestTime) [choice, bestTime] = [d, gt];
			}
		}
		pac.dir = choice;
		Object.assign(pac, step(pac, choice));
	};

	const collide = (prevPac) => {
		for (const g of ghosts) {
			if (g.mode !== 'active') continue;
			const swapped = g.x === prevPac.x && g.y === prevPac.y && g.prev && g.prev.x === pac.x && g.prev.y === pac.y;
			if ((g.x === pac.x && g.y === pac.y) || swapped) {
				if (g.fright > 0) {
					g.mode = 'eyes';
					g.fright = 0;
				} else return true;
			}
		}
		return false;
	};

	for (let i = 0; i < READY_STEPS; i++) record();
	eat(0);
	while (dots.size && frames.length < MAX_STEPS) {
		const t = frames.length;
		const prevPac = { x: pac.x, y: pac.y };
		movePac();
		eat(t);
		for (const g of ghosts) {
			g.prev = { x: g.x, y: g.y };
			moveGhost(g, t);
			if (g.fright > 0) g.fright--;
		}
		if (!ghosts.some((g) => g.fright > 0) && --modeLeft <= 0) {
			modeLeft = MODE_SCHEDULE[++modeIndex];
			for (const g of ghosts) if (g.mode === 'active') g.dir = OPPOSITE[g.dir];
		}
		sinceDot++;
		lifeSteps++;
		if (collide(prevPac)) {
			record();
			record();
			for (let i = 5; i >= 0; i--) record({ ghostsVisible: false, pacScale: i / 6 });
			record({ ghostsVisible: false, pacVisible: false });
			lostLife = true;
			resetActors();
			for (let i = 0; i < 4; i++) record();
			continue;
		}
		record();
	}
	for (let i = 0; i < 3; i++) record();
	for (let i = 0; i < 3; i++) record({ ghostsVisible: false });

	const deaths = frames.filter((f, i) => i && f.pac.scale === 0).length;
	console.log(`game: ${frames.length} steps, ${totalDots - dots.size}/${totalDots} dots, ${deaths} deaths, ${pellets.size} pellets`);
	return { frames, eatenAt, pellets };
};

// Keyframe helpers. Positions interpolate linearly; everything else switches instantly
// (step-end). Keyframes that a linear interpolation would reproduce are dropped.
const pct = (t, total) => `${((t / total) * 100).toFixed(4)}%`;
const px = (p) => [LEFT + p.x * PITCH + CELL / 2, PAD + p.y * PITCH + CELL / 2].map((v) => +v.toFixed(2));

const moveTrack = (name, points, total) => {
	const keys = [];
	points.forEach((p, t) => {
		const prev = points[t - 1];
		if (prev && Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y) > 1.01) keys.push({ t: t - 1 + 0.05, p });
		keys.push({ t, p });
	});
	keys.push({ t: total, p: points.at(-1) });
	const kept = keys.filter((k, i) => {
		const a = keys[i - 1];
		const b = keys[i + 1];
		if (!a || !b) return true;
		const f = (k.t - a.t) / (b.t - a.t);
		return Math.abs(a.p.x + (b.p.x - a.p.x) * f - k.p.x) > 1e-6 || Math.abs(a.p.y + (b.p.y - a.p.y) * f - k.p.y) > 1e-6;
	});
	const body = kept.map((k) => `${pct(k.t, total)}{transform:translate(${px(k.p).join('px,')}px)}`).join('');
	return `@keyframes ${name}{${body}}`;
};

const stepTrack = (name, values, total, css) => {
	const body = values
		.map((v, t) => (t === 0 || v !== values[t - 1] ? `${pct(t, total)}{${css(v)}}` : ''))
		.join('');
	return `@keyframes ${name}{${body}}`;
};

const ghostSvg = (id, i, color) =>
	`<g class="${id}g${i}"><g class="${id}gv${i}">` +
	`<path class="${id}gb${i}" d="M-5.5,5.5V0A5.5,5.5 0 0 1 5.5,0V5.5l-1.83,-1.8l-1.84,1.8l-1.83,-1.8l-1.83,1.8l-1.84,-1.8l-1.83,1.8Z" fill="${color}"/>` +
	`<g class="${id}ge${i}"><circle cx="-2.1" cy="-0.6" r="1.7" fill="#fff"/><circle cx="2.1" cy="-0.6" r="1.7" fill="#fff"/>` +
	`<g class="${id}gp${i}"><circle cx="-2.1" cy="-0.6" r="0.85" fill="#2121de"/><circle cx="2.1" cy="-0.6" r="0.85" fill="#2121de"/></g></g>` +
	`<g class="${id}gf${i}" fill="#ffb8ae"><rect x="-2.6" y="-1.6" width="1.4" height="1.4"/><rect x="1.2" y="-1.6" width="1.4" height="1.4"/>` +
	`<path d="M-3.5,2.6l1,-0.8l1.2,0.8l1.3,-0.8l1.3,0.8l1.2,-0.8l1,0.8" fill="none" stroke="#ffb8ae" stroke-width="0.6"/></g>` +
	`</g></g>`;

// Names are prefixed per theme so both SVGs can be inlined on one page without their
// animations colliding.
const render = (cells, cols, game, { id, levels, border }) => {
	const { frames, eatenAt, pellets } = game;
	const total = frames.length;
	const duration = total * STEP_MS;
	const anim = (cls, name, timing) => `.${id}${cls}{animation:${id}${name} ${duration}ms ${timing} infinite}`;
	const css = [];

	const rects = cells.map((c) => {
		const k = key(c);
		const t = eatenAt.get(k);
		const x = +(LEFT + c.x * PITCH + 0.5).toFixed(2);
		const y = +(PAD + c.y * PITCH + 0.5).toFixed(2);
		const rect = (fill, cls = '') => `<rect${cls} x="${x}" y="${y}" width="${CELL - 1}" height="${CELL - 1}" rx="2" fill="${fill}" stroke="${border}"/>`;
		if (t === undefined) return rect(levels[c.level]);
		css.push(`@keyframes ${id}e${t}{0%,${pct(t, total)}{opacity:1}${pct(t + 0.01, total)},100%{opacity:0}}${anim(`e${t}`, `e${t}`, 'linear')}`);
		const top = rect(levels[c.level], ` class="${id}e${t}"`);
		return rect(levels[0]) + (pellets.has(k) ? `<g class="${id}pp">${top}</g>` : top);
	});
	css.push(`@keyframes ${id}pp{0%,49.9%{opacity:1}50%,100%{opacity:0.25}}.${id}pp{animation:${id}pp 360ms infinite}`);

	// Pac-Man faces the way he is about to move.
	const pacFrames = frames.map((f) => f.pac);
	const facing = pacFrames.map((p, t) => {
		const next = pacFrames[t + 1];
		if (!next) return p.dir;
		const dx = next.x - p.x;
		const dy = next.y - p.y;
		return Math.abs(dx) + Math.abs(dy) === 1 ? (dx ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up') : p.dir;
	});
	css.push(moveTrack(`${id}pm`, pacFrames, total) + anim('pm', 'pm', 'linear'));
	css.push(
		stepTrack(`${id}pr`, pacFrames.map((p, t) => `rotate(${ANGLE[facing[t]]}deg) scale(${p.visible ? p.scale.toFixed(2) : 0})`), total, (v) => `transform:${v}`) +
			anim('pr', 'pr', 'step-end')
	);
	css.push(`@keyframes ${id}chomp{0%,49.9%{opacity:1}50%,100%{opacity:0}}.${id}open{animation:${id}chomp 240ms infinite}.${id}shut{animation:${id}chomp 240ms -120ms infinite}`);

	const ghostSvgs = [];
	const colors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
	colors.forEach((color, i) => {
		const gf = frames.map((f) => f.ghosts[i]);
		css.push(moveTrack(`${id}g${i}`, gf, total) + anim(`g${i}`, `g${i}`, 'linear'));
		css.push(stepTrack(`${id}gv${i}`, gf.map((g) => (g.visible ? 1 : 0)), total, (v) => `opacity:${v}`) + anim(`gv${i}`, `gv${i}`, 'step-end'));
		const body = { normal: [color, 1], blue: ['#2121de', 1], white: ['#dedede', 1], eyes: [color, 0] };
		css.push(stepTrack(`${id}gb${i}`, gf.map((g) => g.look), total, (v) => `fill:${body[v][0]};opacity:${body[v][1]}`) + anim(`gb${i}`, `gb${i}`, 'step-end'));
		css.push(stepTrack(`${id}ge${i}`, gf.map((g) => (g.look === 'normal' || g.look === 'eyes' ? 1 : 0)), total, (v) => `opacity:${v}`) + anim(`ge${i}`, `ge${i}`, 'step-end'));
		css.push(stepTrack(`${id}gf${i}`, gf.map((g) => (g.look === 'blue' || g.look === 'white' ? 1 : 0)), total, (v) => `opacity:${v}`) + anim(`gf${i}`, `gf${i}`, 'step-end'));
		css.push(stepTrack(`${id}gp${i}`, gf.map((g) => g.dir), total, (d) => `transform:translate(${DIRS[d][0] * 0.7}px,${DIRS[d][1] * 0.7}px)`) + anim(`gp${i}`, `gp${i}`, 'step-end'));
		ghostSvgs.push(ghostSvg(id, i, color));
	});

	const r = 6;
	const mx = (r * Math.cos(Math.PI / 5)).toFixed(2);
	const my = (r * Math.sin(Math.PI / 5)).toFixed(2);
	const pacman =
		`<g class="${id}pm"><g class="${id}pr"><path class="${id}open" d="M0,0L${mx},-${my}A${r},${r} 0 1 0 ${mx},${my}Z" fill="#ffd400"/>` +
		`<circle class="${id}shut" r="${r}" fill="#ffd400"/></g></g>`;

	const width = LEFT + cols * PITCH - GAP + PAD;
	const height = PAD + ROWS * PITCH - GAP + PAD;
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
		`<style>${css.join('')}</style>${rects.join('')}${ghostSvgs.reverse().join('')}${pacman}</svg>`
	);
};

const calendar = await fetchCalendar();
const cells = calendar.weeks.flatMap((w, x) =>
	w.contributionDays.map((d) => ({ x, y: d.weekday, level: LEVEL[d.contributionLevel] ?? 0 }))
);
const cols = calendar.weeks.length;
const game = simulate(cells, cols);
fs.mkdirSync(outDir, { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
	const out = path.join(outDir, name);
	fs.writeFileSync(out, render(cells, cols, game, theme));
	console.log(`SVG saved to ${out}`);
}
