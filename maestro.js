let fs = require('fs');

function Maestro (basedir = '') {
	_self = this;
	_startCalled = false;
	_initialized = false;

	_baseDir = basedir;
	_loadPromise = Promise.resolve();

	_modules = {};
	_inits = [];
	_subscriptions = {};

	_checkInitialization = () => {
		if (_initialized)
			throw '[Maestro] Already initialized!';
	}

	_createFilePromise = (file) => {
		return new Promise((resolve, reject) => {
			fs.stat(file, (error, stats) => {
				if (!error && !stats.isDirectory()) {
					let _module = require(`${_baseDir}/${file}`);
					_module(_self);
				}

				resolve();
			})
		});
	}

	_loadFile = (file) => {
		return () => _createFilePromise(file);
	}

	_loadDir = (dir) => {
		return () => new Promise((resolve, reject) => {
			fs.readdir(dir, (error, files) => {
				if (error)
					reject(error);
				else
					resolve(files.map(f => `${dir}/${f}`));
			});
		});
	}

	_orderChain = (items) => {
		let _result = [];
		let _visit = (i) => {
			if (i.visited) return;

			i.visited = true;

			for (let j of i.dependencies || []) {
				let _dependency = items.find(item => item.name === j);

				if (!_dependency)
					throw `Dependency not found (${j})`;

				visit(_dependency);
			}

			_result.push(i);
		};

		while (items.length > _result.length)
			visit(items.find(item => !item.visited));

		return _result;
	}

	_executeProviders = () => {
		return new Promise((resolve, reject) => {
			let _providersChain = [];

			for (let name in _modules)
				_providersChain.push({
						name: name,
						dependencies: _modules[name].dependencies
				});

			_orderedChain = _orderChain(_providersChain);
			_configPromise = Promise.resolve();

			for (let provider of _orderedChain)
				_configPromise = _configPromise.then((moduleName => {
					return () => {
						let _module = _modules[moduleName];
						let _dependencies = _module.dependencies.map(d => _modules[d].instance)

						return _module
							.provider(..._dependencies)
							.then(instance => _module.instance = instance)
							.catch(error => reject(error));
					};
				})(provider.name));

			_configPromise.then(() => resolve());
		});
	}

	_executeInits = () => {
		return new Promise((resolve, reject) => {
			let _promises = [];

			for (let init of _inits) {
				let _dependencies = [];

				for (let dependency of init.dependencies) {
					let _dependency = _modules[dependency];

					if (!_dependency)
						throw `Dependency not found (${d})`;

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

	this.define = () => {
		let moduleName = arguments[0];
		let moduleConstructor = arguments[arguments.length - 1];
		let dependencies = arguments.splice(1, arguments.length - 2);

		_self.provide(moduleName, ...dependencies, (loadedDependencies) => {
			return new Promise((resolve, reject) => {
				resolve(new moduleConstructor(loadedDependencies));
			});
		});
	}

	this.provide = () => {
		_checkInitialization();

		let moduleName = arguments[0];
		let moduleProvider = arguments[arguments.length - 1];
		let dependencies = arguments.splice(1, arguments.length - 2);

		_modules[moduleName] = {
			dependencies: dependencies,
			provider: moduleProvider
		};

		return _self;
	}

	this.init = () => {
		_checkInitialization();

		let func = arguments[arguments.length - 1];
		let dependencies = arguments.splice(1, arguments.length - 1);

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
				_subscriptions.splice(index, 1);
		}

		return _self;
	}

	this.broadcast = (message, data) => {
		return;
	}

	this.resolve = (moduleName) => {
		if (!_initialized)
			throw `[Maestro] Cannot get ${moduleName}. Maestro is not initialized yet!`;

		if (!_modules[moduleName])
			throw `[Maestro] Block ${moduleName} not provided!`;

		return _modules[moduleName].instance;
	}

	this.start = () => {
		let _checkPromise = new Promise((resolve, reject) => {
			_checkInitialization();

			if (_startCalled)
				throw '[Maestro] Start already called!';

			resolve();
		});

		_checkPromise
			.then(() => _startCalled = true)
			.then(_loadPromise)
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
