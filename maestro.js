let fs = require('fs');

function Maestro (basedir = '') {
	let _self = this;
	let _startCalled = false;
	let _initialized = false;

	let _baseDir = basedir;
	let _loadPromise = Promise.resolve();

	let _modules = {};
	let _inits = [];
	let _subscriptions = {};

	let _checkInitialization = () => {
		if (_initialized)
			throw '[Maestro] Already initialized!';
	}

	let _createFilePromise = (file) => {
		return new Promise((resolve, reject) => {
			let _file = `${_baseDir}/${file}`;

			if (!_file.endsWith('.js'))
				_file = `${_file}.js`;

			fs.stat(_file, (error, stats) => {
				if (!error && !stats.isDirectory()) {
					let _module = require(_file);
					_module(_self);
					resolve();
				}
				else
					reject(error);
			})
		});
	}

	let _loadFile = (file) => {
		return () => _createFilePromise(file);
	}

	let _loadDir = (dir) => {
		return () => new Promise((resolve, reject) => {
			let _dir = `${_baseDir}/${dir}`;
			fs.readdir(_dir, (error, files) => {
				if (error)
					reject(error);
				else
					resolve(files.map(f => `${_dir}/${f}`));
			});
		});
	}

	let _orderChain = (items) => {
		let _result = [];
		let _visit = (i) => {
			if (i.visited) return;

			i.visited = true;

			for (let j of i.dependencies || []) {
				let _dependency = items.find(item => item.name === j);

				if (!_dependency)
					throw `Dependency not found (${j})`;

				_visit(_dependency);
			}

			_result.push(i);
		};

		while (items.length > _result.length)
			_visit(items.find(item => !item.visited));

		return _result;
	}

	let _executeProviders = () => {
		return new Promise((resolve, reject) => {
			let _providersChain = [];

			for (let name in _modules)
				_providersChain.push({
						name: name,
						dependencies: [..._modules[name].dependencies]
				});

			_providersChain.forEach(p => {
				for (let i = 0; i < p.dependencies.length; i++)
					if (p.dependencies[i].startsWith('.')) {
						let args = _providersChain
							.map(p => p.name)
							.filter(n => n.endsWith(p.dependencies[i]));

						args.unshift(i, 1);
						p.dependencies.splice.apply(p.dependencies, args);
					}
			});

			_orderedChain = _orderChain(_providersChain);
			_configPromise = Promise.resolve();

			for (let provider of _orderedChain)
				_configPromise = _configPromise.then((_provider => {
					return () => {
						let _module = _modules[_provider.name];

						let _dependencies = _module.dependencies.map(current => {
							let result = _modules[current] && _modules[current].instance;

							if (!result)
								result = _provider.dependencies
									.filter(d => d.endsWith(current))
									.map(d => _modules[d].instance);

							return result;
						});

						return _module
							.provider(..._dependencies)
							.then(instance => _module.instance = instance)
							.catch(error => reject(error));
					};
				})(provider));

			_configPromise.then(() => resolve());
		});
	}

	let _executeInits = () => {
		return new Promise((resolve, reject) => {
			let _promises = [];

			for (let init of _inits) {
				let _dependencies = [];

				for (let dependency of init.dependencies) {
					let _dependency = _modules[dependency];

					if (!_dependency)
						throw `Dependency not found (${dependency})`;

					_dependencies.push(_dependency.instance);
				}

				_promises.push(init.func(..._dependencies))
			}

			return Promise
				.all(_promises)
				.catch(error => reject(error))
				.then(() => resolve());
		});
	}

	this.loadFiles = (...files) => {
		_checkInitialization();

		for (let file of files)
			_loadPromise = _loadPromise.then(_loadFile(file));

		return _self;
	}

	this.loadDirs = (...dirs) => {
		_checkInitialization();

		for (let dir in dirs)
			_loadPromise = _loadPromise
				.then(_loadDir(dir))
				.then((files) => Promise.all(files.map(f => _createFilePromise(f))));

		return _self;
	}

	this.define = (...args) => {
		let moduleName = args[0];
		let moduleConstructor = args[args.length - 1];
		let dependencies = args.splice(1, args.length - 2);

		_self.provide(moduleName, ...dependencies, (loadedDependencies) => {
			return new Promise((resolve, reject) => {
				resolve(new moduleConstructor(loadedDependencies));
			});
		});
	}

	this.provide = (...args) => {
		_checkInitialization();

		let moduleName = args[0];
		let moduleProvider = args[args.length - 1];
		let dependencies = args.splice(1, args.length - 2);

		_modules[moduleName] = {
			dependencies: dependencies,
			provider: moduleProvider
		};

		return _self;
	}

	this.init = (...args) => {
		_checkInitialization();

		let func = args[args.length - 1];
		let dependencies = args.splice(0, args.length - 1);

		_inits.push({
			dependencies: dependencies,
			func: func
		});

		return _self;
	}

	this.listen = (message, subscription) => {
		if (!_subscriptions[message])
			_subscriptions[message] = [];

		_subscriptions[message].push(subscription);

		return _self;
	}

	this.ignore = (message, subscription) => {
		if (_subscriptions[message]) {
			let index = _subscriptions[message].findIndex(s => s === subscription);
			if (index >= 0)
				_subscriptions[message].splice(index, 1);
		}

		return _self;
	}

	this.broadcast = (message, data) => {
		let promises = [];

		for (let subscribers of _subscriptions[message]) {
			var result = subscribers(data);
			if (!result || result.constructor != Promise)
				result = Promise.resolve(result);

			promises.push(result);
		}

		return Promise.all(promises);
	}

	this.resolve = (moduleName) => {
		if (!_initialized)
			throw `[Maestro] Cannot get ${moduleName}. Maestro is not initialized yet!`;

		let result = _modules[moduleName] && _modules[moduleName].instance;

		if (!result)
			for (let i in _modules)
				if (i.endsWith(moduleName)) {
					result = result || [];
					result.push(_modules[i].instance);
				}

		if (!result)
			throw `[Maestro] Block ${moduleName} not provided!`;

		return result;
	}

	this.start = () => {
		let _checkPromise = new Promise((resolve, reject) => {
			_checkInitialization();

			if (_startCalled)
				throw '[Maestro] Start already called!';

			resolve();
		});

		return _checkPromise
			.then(() => _startCalled = true)
			.then(() => _loadPromise)
			.catch(error => {
				error = "[Maestro] Error loading files: \r\n#{error} \r\n#{error.stack}";

				return Promise.reject(error);
			})
			.then(_executeProviders)
			.catch(error => {
				if (!error.startsWith || !error.startsWith('[Maestro]'))
					error = `[Maestro] Error running providers: \r\n${error} \r\n${error.stack}`;

				return Promise.reject(error);
			})
			.then(_executeInits)
			.catch(error => {
				if (!error.startsWith || !error.startsWith('[Maestro]'))
					error = `[Maestro] Error running inits: \r\n${error} \r\n${error.stack}`;

				return Promise.reject(error);
			})
			.then(() => {
				_initialized = true;

				return _self;
			});
	}
}

module.exports = Maestro;
