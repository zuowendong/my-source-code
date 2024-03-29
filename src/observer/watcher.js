import { pushTarget, popTarget } from "./dep";
import { nextTick } from "../utils/nextTick";

let id = 0;
class Watcher {
	constructor(vm, exprOrfn, cb, options) {
		this.vm = vm;
		this.exprOrfn = exprOrfn;
		this.cb = cb;
		this.options = options;
		this.id = id++; // 标识 每个组件 都只有一个watcher
		this.user = !!options.user;
		this.deps = []; // watcher存放dep
		this.depsId = new Set();

		if (typeof exprOrfn === "function") {
			this.getter = exprOrfn;
		} else {
			// console.log(exprOrfn); // 字符串  "info.name.msg"
			this.getter = function () {
				let paths = exprOrfn.split(".");
				let _vm = vm;
				for (let i = 0; i < paths.length; i++) {
					_vm = _vm[paths[i]];
				}
				// console.log(_vm);
				return _vm;
			};
		}
		// 更新视图
		this.value = this.get(); // 保存 watch 初始值
		// console.log(this.value);
	}

	addDep(dep) {
		// 去重 -> 存过的不能再存
		let id = dep.id;
		if (!this.depsId.has(id)) {
			this.deps.push(dep);
			this.depsId.add(id);
			dep.addSub(this); // 双向记忆，dep里存放了watcher,watcher里存放了dep
		}
	}

	// 初次渲染 (更新 插值表达式)
	get() {
		pushTarget(this); // 给 dep 添加 watcher
		const value = this.getter(); // 渲染页面
		popTarget(); // 给 dep 取消 watcher
		return value;
	}
	// 更新数据
	update() {
		// 不要数据更新之后 每次都调用get  ->  缓存
		// this.get(); // 重新渲染
		queueWatcher(this);
	}

	run() {
		// watch 参数  newVal, oldVal
		let value = this.get(); // newVal
		let oldValue = this.value; // watch初始化时保存在实例上的值
		this.value = value;

		// 执行handler  -> cb 这个是用户的watch
		if (this.user) {
			this.cb.call(this.vm, value, oldValue);
		}
	}
}

let queue = []; // 将需要批量更新的 watcher 存放到 队列中
let has = {};
let pending = false;
function queueWatcher(watcher) {
	let id = watcher.id; // 每个组件都是同一个 watcher
	// console.log(id);
	// 去重
	if (!has[id]) {
		queue.push(watcher);
		// console.log(queue);
		has[id] = true;

		// 防抖，用户触发多次，只执行一次
		if (!pending) {
			// 异步， 等待同步代码执行完成之后 再来执行
			// setTimeout(() => {
			// 	queue.forEach((item) => item.run());
			// 	queue = [];
			// 	has = {};
			// 	pending = false;
			// });
			// 优化
			nextTick(flushWatcher);
		}
		pending = true;
	}
}
function flushWatcher() {
	queue.forEach((item) => {
		item.run();
	});
	queue = [];
	has = {};
	pending = false;
}

export default Watcher;

/**
 * 收集依赖 dep watcher data: {msg}
 * dep: dep和data中属性 是一一对应的
 * watcher: 在视图上data用了几个, 就有几个watcher
 *
 * dep 和 watcher 的关系
 *  一  对 多 的关系  dep.msg = [watcher1, watcher2]
 */
