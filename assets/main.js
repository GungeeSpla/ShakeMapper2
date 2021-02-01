let canvas;
let ctx;
let stageImage;
let objs;
let unit_names;
let layer_names;
let check_state = {
	'stage': 'shakeup',
	'type': 'photo',
	'nodelinks': true,
	'scale': 'scale-0.7',
	'Cmn': true,
	'CoopGraph_0': true,
	'CoopWater_0': true,
	'CoopWater_1': true,
	'CoopWater_2': true,
	'Tmp': true,
	'CoopGraphNode': true,
	'CoopGraphNodeDangerousPos': true,
	'Obj_CoopIkuraBankBase': true,
	'Obj_CoopGraphArea': true
};

/** get_data(element)
 */
function get_data(element) {
	const data = {};
	const children = element.children;
	Array.prototype.forEach.call(children, (child, i) => {
		let name = child.getAttribute('Name');
		if (!name) {
			name = i;
			data.length = i + 1;
		}
		let value = child.getAttribute('StringValue');
		if (value) {
			const float = parseFloat(value);
			if (!isNaN(float)) {
				value = float;
			}
			data[name] = value;
		} else {
			data[name] = get_data(child);
		}
	});
	return data;
}

/** load_xml(num)
 */
function load_xml(num) {
	const req = new XMLHttpRequest();
	req.onreadystatechange = function() {
		if (req.readyState === 4) {
			if (req.status === 200) {
				const doc = req.responseXML.documentElement;
				const elms = doc.querySelectorAll('Root>C1>C0>C1');
				objs = [];
				unit_names = [];
				layer_names = [];
				Array.prototype.forEach.call(elms, (elm, i) => {
					const obj = get_data(elm);
					const unit = obj['UnitConfigName'];
					const layer = obj['LayerConfigName'];
					if (!unit_names.includes(unit)) {
						unit_names.push(unit);
					}
					if (!layer_names.includes(layer)) {
						layer_names.push(layer);
					}
					objs.push(obj);
				});
				layer_names.sort();
				unit_names.sort();
				let p_area;
				p_area = document.getElementById('layer-area');
				p_area.innerHTML = '';
				layer_names.forEach((name) => {
					const label = document.createElement('label');
					label.setAttribute('for', name);
					label.innerHTML = `<input id="${name}" type="checkbox" ${(check_state[name]) ? 'checked="checked"' : ''}>${name}`;
					label.querySelector('input').onchange = update_canvas;
					p_area.appendChild(label);
				});
				p_area = document.getElementById('object-area');
				p_area.innerHTML = '';
				unit_names.forEach((name) => {
					const label = document.createElement('label');
					label.setAttribute('for', name);
					label.innerHTML = `<input id="${name}" type="checkbox" ${(check_state[name]) ? 'checked="checked"' : ''}>${name}`;
					label.querySelector('input').onchange = update_canvas;
					p_area.appendChild(label);
				});
				objs.sort((a, b) => {
					const ya = a['Translate'] && a['Translate']['Y'] || 0;
					const yb = b['Translate'] && b['Translate']['Y'] || 0;
					return (ya > yb) ? 1 : -1;
				});
				update_canvas();
			}
		}
	};
	req.open('GET', './assets/xml/' + num + '.xml');
	req.send(null);
}

/** update_check_state()
 */
function update_check_state() {
	const elms = document.querySelectorAll('input[type=checkbox]');
	Array.prototype.forEach.call(elms, (elm) => {
		const id = elm.getAttribute('id');
		const checked = !!elm.checked;
		check_state[id] = checked;
	});
}

/** get_obj(id)
 */
function get_obj(id) {
	for (let i = 0; i < objs.length; i++) {
		if (objs[i]['Id'] === id) {
			return objs[i];
		}
	}
	return null;
}

/** update_canvas()
 */
function update_canvas() {
	console.info('update canvas');
	update_check_state();
	ctx.clearRect(0, 0, 2400, 2400);
	ctx.drawImage(stageImage, 0, 0);
	objs.forEach((obj) => {
		const unit = obj['UnitConfigName'];
		if (!check_state[unit]) {
			return;
		}
		const layer = obj['LayerConfigName'];
		if (!check_state[layer]) {
			return;
		}
		console.log(obj);
		const hsl = str_to_hsl(unit.replace('DangerousPos', ''));
		const hsl_2 = str_to_hsl(unit.replace('DangerousPos', ''), 50);
		const x = obj['Translate']['X'] + 1200;
		const z = obj['Translate']['Z'] + 1200;
		const sx = obj['Scale']['X'];
		const sz = obj['Scale']['Z'];
		const ry = obj['Rotate']['Y'];
		const links = obj['Links'];
		if (check_state['nodelinks'] && links && Object.keys(links).length) {
			for (let key in links) {
				const len = links[key].length;
				for (let i = 0; i < len; i++) {
					const link = links[key][i];
					const target_type = link['DefinitionName'];
					const target_id = link['DestUnitId'];
					const target_obj = get_obj(target_id);
					if (target_obj) {
						const x2 = target_obj['Translate']['X'] + 1200;
						const z2 = target_obj['Translate']['Z'] + 1200;
						ctx.strokeStyle = 'hsla(' + hsl + ', 1)';
						if (target_type === 'ToGraphNodeUnidirectionalDrop') {
							ctx.lineWidth = 4;
							ctx.setLineDash([4, 4, 14, 4]);
						} else {
							ctx.lineWidth = 1;
							ctx.setLineDash([]);
						}
						ctx.beginPath();
						ctx.moveTo(x, z);
						ctx.lineTo(x2, z2);
						ctx.stroke();
					}
				}
			};
			ctx.setLineDash([]);
		}
		if (!obj['UnitConfigName'].includes('Rail')) {
			ctx.save();
			ctx.translate(x, z)
			ctx.rotate(- ry * Math.PI/180);
			let w = 10;
			let h = 10;
			if (obj['UnitConfigName'].includes('IkuraBank')) {
				w = 25;
				h = 25;
				ctx.fillStyle = 'hsla(' + hsl + ', 1)';
				ctx.fillRect(- w/2, - h/2, w, h);
			} else if (obj['UnitConfigName'].includes('Obj_CoopLocatorSpawnBox') || obj['UnitConfigName'].includes('PaintedArea_Cylinder')) {
				w *= sx;
				h *= sz;
				ctx.fillStyle = 'hsla(' + hsl + ', .1)';
				ctx.strokeStyle = 'hsla(' + hsl + ', 1)';
				ctx.lineWidth = 1;
				ctx.beginPath();
				//ctx.arc(0, 0, w/2, 0, Math.PI*2, false);
				ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI*2, false);
				ctx.fill();
				ctx.stroke();
			} else if (sx === 1 && sz === 1) {
				ctx.beginPath();
				ctx.arc(0, 0, w/2, 0, Math.PI*2, false);
				ctx.fillStyle = 'hsla(' + hsl + ', 1)';
				ctx.fill();
			} else {
				w *= sx;
				h *= sz;
				ctx.fillStyle = 'hsla(' + hsl + ', .1)';
				ctx.strokeStyle = 'hsla(' + hsl + ', 1)';
				ctx.lineWidth = 1;
				ctx.fillRect(- w/2, - h/2, w, h);
				ctx.strokeRect(- w/2, - h/2, w, h);
			}
			ctx.restore();
		}
		const rail_points = obj['RailPoints'];
		if (rail_points) {
			ctx.beginPath();
			ctx.strokeStyle = 'hsla(' + hsl + ', 1)';
			ctx.lineWidth = 2;
			//ctx.moveTo(x, z);
			const x1 = rail_points[0]['Translate']['X'] + 1200;
			const z1 = rail_points[0]['Translate']['Z'] + 1200;
			ctx.moveTo(x1, z1);
			const len = rail_points.length;
			const last = (obj['UnitConfigName'].includes('Pink')) ? len : len + 1;
			if (obj['RailType'] === 'Linear') {
				for (let i = 1; i < last; i++) {
					const i2 = (i - 0) % len;
					const p2 = rail_points[i2];
					const x2 = p2['Translate']['X'] + 1200;
					const z2 = p2['Translate']['Z'] + 1200;
					ctx.lineTo(x2, z2);
				}
			} else {
				for (let i = 1; i < last; i++) {
					const i1 = (i - 1) % len;
					const i2 = (i - 0) % len;
					const p1 = rail_points[i1];
					const p2 = rail_points[i2];
					const c1 = {
						x: p1['ControlPoints'][1]['X'] + 1200,
						z: p1['ControlPoints'][1]['Z'] + 1200
					};
					const c2 = {
						x: p2['ControlPoints'][0]['X'] + 1200,
						z: p2['ControlPoints'][0]['Z'] + 1200
					};
					const x2 = p2['Translate']['X'] + 1200;
					const z2 = p2['Translate']['Z'] + 1200;
					ctx.bezierCurveTo(c1.x, c1.z, c2.x, c2.z, x2, z2);
				}
			}
			ctx.stroke();
		}
	});
	save_storage();
}

/** save_storage()
 */
function save_storage() {
	const storage_item = { check_state };
	localStorage.setItem('shakemapper', JSON.stringify(storage_item));
}

/** clear_storage()
 */
function clear_storage() {
	localStorage.removeItem('shakemapper');
}

/** ask_clear_storage()
 */
function ask_clear_storage() {
	if (window.confirm('このページで使用しているローカルストレージを削除してから、このページを再読み込みします。よろしいですか？')) {
		localStorage.removeItem('shakemapper');
		location.reload();
	}
}

/** select_stage()
 */
function select_stage(num) {
	stageImage = document.getElementById(check_state['type'] + '-' + num);
	ctx.clearRect(0, 0, 2400, 2400);
	ctx.drawImage(stageImage, 0, 0);
	load_xml(num);
	save_storage();
}

/** change_stage()
 */
function change_stage() {
	const checked_element = document.querySelector('input[type=radio][name=stage]:checked');
	const id = checked_element.getAttribute('id');
	check_state['stage'] = id;
	const num = parseInt(checked_element.getAttribute('num'));
	select_stage(num);
	save_storage();
}

/** change_type()
 */
function change_type() {
	const checked_element = document.querySelector('input[type=radio][name=type]:checked');
	const checked_element_2 = document.querySelector('input[type=radio][name=stage]:checked');
	const id = checked_element.getAttribute('id');
	check_state['type'] = id;
	const num = parseInt(checked_element_2.getAttribute('num'));
	select_stage(num);
	save_storage();
}

/** str_to_hsl(str)
 */
function str_to_hsl(str, a = 0) {
	let hue = 0;
	for  (let i = 0; i < str.length; i++) {
		const c = str.charCodeAt(i);
		hue += c;
	}
	hue = parseInt(1.5 * (hue + 140 + a)) % 360;
	const saturation = 100;
	let brightness = 50;
	if (40 < hue && hue < 200) {
		brightness = 40;
	}
	return `${hue}, ${saturation}%, ${brightness}%`;
}

/** change_scale()
 */
function change_scale() {
	const checked_element = document.querySelector('input[type=radio][name=scale]:checked');
	const id = checked_element.getAttribute('id');
	check_state['scale'] = id;
	const i = parseFloat(checked_element.getAttribute('num'));
	let w = parseInt(2400 * i);
	const right = document.getElementById('right');
	const rect = right.getBoundingClientRect();
	const wh = window.innerHeight;
	const ww = window.innerWidth - rect.left;
	const ws = Math.min(wh, ww);
	if (i === 0.5) {
		w = ws;
	}
	canvas.style.setProperty('width', w + 'px');
	canvas.style.setProperty('height', w + 'px');
	right.scrollTop = Math.max(0, (w - wh)/2);
	right.scrollLeft = Math.max(0, (w - ww)/2);
}

/** onload()
 */
window.onload = () => {
	loading = document.getElementById('loading');
	loading.ontransitionend = () => {
		loading.remove();
	};
	loading.classList.add('hidden');
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');
	canvas.width = 2400;
	canvas.height = 2400;
	const storage_item = localStorage.getItem('shakemapper');
	if (storage_item) {
		Object.assign(check_state, JSON.parse(storage_item).check_state);
	}
	document.getElementById('nodelinks').checked = !!check_state['nodelinks'];
	document.getElementById('nodelinks').onchange = change_stage;
	let p_area;
	p_area = document.getElementById('stage-area');
	for (let i = 0; i < 5; i++) {
		const name = ['shakeup', 'shakeship', 'shakehouse', 'shakelift', 'shakeride'][i];
		const name_jp = ['シェケナダム', '難破船ドン･ブラコ', '海上集落シャケト場', 'トキシラズいぶし工房', '朽ちた箱舟 ポラリス'][i];
		const label = document.createElement('label');
		label.setAttribute('for', name);
		label.innerHTML = `<input id="${name}" name="stage" num="${i}" type="radio" ${(check_state['stage'] === name) ? 'checked="checked"' : ''}>${name_jp}`;
		label.querySelector('input').onchange = change_stage;
		p_area.appendChild(label);
	}
	p_area = document.getElementById('type-area');
	for (let i = 0; i < 2; i++) {
		const name = ['photo', 'plan'][i];
		const name_jp = ['リアル', '平面図'][i];
		const label = document.createElement('label');
		label.setAttribute('for', name);
		label.innerHTML = `<input id="${name}" name="type" num="${i}" type="radio" ${(check_state['type'] === name) ? 'checked="checked"' : ''}>${name_jp}`;
		label.querySelector('input').onchange = change_type;
		p_area.appendChild(label);
	}
	p_area = document.getElementById('scale-area');
	for (let i = 0.5; i <= 1; i += 0.1) {
		const name = 'scale-' + i;
		const name_jp = (i === 0.5) ? '画面にフィット' : Math.round(i * 100) + '%';
		const label = document.createElement('label');
		label.setAttribute('for', name);
		label.innerHTML = `<input id="${name}" name="scale" num="${i}" type="radio" ${(check_state['scale'] === name) ? 'checked="checked"' : ''}>${name_jp}`;
		label.querySelector('input').onchange = change_scale;
		p_area.appendChild(label);
	}
	change_scale();
	change_stage();
};
