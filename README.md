# Maestro

Maestro is an orchestrator based on [iNGector](https://github.com/Codifica208/iNGector) (which is a Dependency Injection module inspired by the AngularJS's DI).

### So ... what makes Maestro a newer and better version of iNGector?

After using iNGector in some projects we realized that there were missing features and there were some things that could be droped.

- ##### Message Broadcast.
We added a simplified listen/broadcast message bus.

- ##### Dependencies by class.
Now you don't have to depend upon a giant list of similar modules. You just cast them as a group using the **.class** convention.

- ##### No more Web Browser mode.
There are tons of frameworks to develop front-ends (e.g.: [Aurelia.io](http://aurelia.io)) which has their own organization style. So we droped out the web browser mode.

- ##### No more CoffeeScript source code.
As ES6 brought arrow functions and some improvements on loop iterations we felt that there was no need to use CoffeeScript anymore.

### Why another Dependency Injection module?

As we could not find any other simple and elegant DI module as AngularJS's one, we took its style and implemented a simple promise based version of it.

## Dependency Injection

Maestro has two main methods: **provide** and **init**, which are similar to AngularJS's DI *config* and *run*.


#### The PROVIDE method

This method allows you to serve some implementation that can be requested by other parts.

It accepts the following arguments:

- **name**: an identifier for the provided implementation.
- **dependencies**: all names/classes of the parts needed by your piece of code.
- **builder function**: a function that will be called to this part. It receives all the declared dependencies as arguments and must return a Promise.

```javascript
.provide('my-piece-of-code', 'some-dependency', 'some-other-dependency', (someDependency, someOtherDependency) => {
	return Promise.resolve({
		showMessage: message => {
			alert(message);
		}
	});
});
```

#### The INIT method

This method allows you to run a piece of code after all provided implementation is set.

It accepts the following arguments:

- **dependencies**: all names/classes of the parts needed by your piece of code.
- **run function**: a function that will be called after all provided blocks are processed. It also receives all the declared dependencies as arguments.

```javascript
.init('my-piece-of-code', part => {
	part.showMessage('App is running!!');
});
```

#### Grouping dependencies with class

You can also request a group of other parts using the **.class** convention:

```javascript
.provide('my-piece-of-code', '.group', groupArray => {
	return Promise.resolve({
		showMessage: message => {
			alert(message);
		}
	});
});
```

All parts named with the class (e.g. **example.group**) will be served in an array.

#### Chaining method calls

Both PROVIDE and INIT methods can be chained to each other, so you can call them like this:

```javascript
.provide('mod-b', 'mod-a', modA => {...})
.provide('mod-a', () => {...})
.init(() => {...});
```

ps.: as you may notice, they do not need to be called in the correct order of dependency needs, Maestro will handle this for you.


### OK, all parts provided and all init blocks registered! Now what?!

#### The START method

This method tells Maestro that it must prepare and go. This is achieved in three phases:

1. ChainSolve Phase: solve the dependency chain and queue builder functions in needed order.
2. ExecuteProvideBlocks Phase: call all builder functions in needed order.
3. ExecuteInitBlocks Phase: call all run functions.

It needs no arguments and returns a Promise that resolves with Maestro instance as result.

```javascript
.start()
.then(di => {
	// di is the Maestro instance
	console.log('All good!');
})
.catch(error => {
	console.log(`Some error occured: ${error}`);
});
```

#### The RESOLVE method
Once Maestro is started, you can call *resolve* method to get a piece of code previously provided.

It accepts the name as the only argument.

```javascript
.start()
.then(di => {
	di.resolve('my-piece-of-code').showMessage('See!?');
});
```

## Message Bus

As we mentioned, Maestro's message bus is a simple listen/broadcast feature.

#### The LISTEN method

This method allows you to watch over a channel.

It accepts the following arguments:

- **channel key**: the message channel identifier.
- **handler**: a callback function that will be called whenever a message is broadcasted. It receives the message data as the only argument.


```javascript
di.listen('channel-key', data => {
	console.log('You have a new message!');
});
```

#### The IGNORE method

This method allows you to stop watching over a channel.

It accepts the following arguments:

- **channel key**: the message channel identifier.
- **handler**: the callback function that used to listen to that channel.

```javascript
di.ignore('channel-key', myHandler);
```

### Broadcasting data

Once all listeners are registered to its channels you can start broadcasting.

#### The BROADCAST method

This method allows you to send a message to all listeners of a channel.

It accepts the following arguments:

- **channel key**: the message channel identifier.
- **message data**: the callback function that used to listen to that channel.

```javascript
di.broadcast('channel-key', 'Hello subscribers!');
```

ps.: the message does not need to be a string.

```javascript
di.ignore('channel-key', { name: 'John Doe', age: 30 });
```

## File loading

We all know that a huge file sucks and we split our code in several files across several directories. To make everything easier, Maestro has some methods to help you loading those files.

#### The LOADFILES method

This method loads all requested files through **require** and then invoke the result passing the Maestro instance.

It accepts files paths as arguments.

```javascript
di.loadFiles('/controllers/my-controller', '/config/server');
```

In order to **loadFiles** to work, all loaded files must exports a function that accepts the Maestro instance as argument.

```javascript
module.exports = function (di) {
	di.provide(...).provide(...).provide(...);
}
```

#### The LOADDIRS method

This method loads all files in all requested directories just like the LOADFILES method.

It accepts directories paths as arguments.

```javascript
di.loadDirs('/controllers', '/config', '/start');
```

#### The CONSTRUCTOR

Sometimes you may find yourself having problems of relative path with Node's **require** function.
To avoid that, it is common to use the **__dirname** variable, which gives you the current path location, in order to set the start point of relative paths.
As Maestro usually is in **node_modules** folder, you can set your start point through the constructor.

It accepts a path as the only argument.

```javascript
let di = new Maestro(__dirname + '/src');
```

#### Chaining method calls

All of LOADFILES and LOADDIRS methods can be chained to each other, so you can call them like this:

```javascript
di.loadDirs('/controllers', '/config').loadFiles('/start/app');
```

## Error handling
Last but not least, Maestro throws exceptions with the following messages:

- **[Maestro] Error loading files: [ERROR]**. Occurs whenever a file is not found or is corrupted.

- **[Maestro] Error running providers: [ERROR]**. Occurs whenever a Promise catches an error during *ChainSolve Phase* or *ExecuteProvideBlocks Phase*.

- **[Maestro] Error running inits: [ERROR]**. Occurs whenever a Promise catches an error during *ExecuteProvideBlocks Phase*.

- **[Maestro] Already initialized!**. Occurs when:
	- PROVIDE, INIT or START methods are called after initialization.
	- LOADFILES or LOADDIRS methods are called after initialization. (node only)

- **[Maestro] Start already called!**. Occurs when START method is called more than once.

- **[Maestro] Cannot get [DEPENDENCY NAME]. Maestro is not initialized yet!**. Occurs when RESOLVE method is called before the initialization.

- **[Maestro] Block [DEPENDENCY NAME] not provided!**. Occurs when RESOLVE method cannot find any part with given name.

## Installing

Maestro is available at NPM under the name [maestro-io](https://www.npmjs.com/package/maestro-io) and can be installed with the command:

```bash
npm install maestro-io
```

then just require and instantiate

```javascript
let Maestro = require('maestro');
let di = new Maestro();
```

## Contributing
Maestro is under [MIT LICENSE](/LICENSE.md). You can use, copy, change and so on.
Feel free to open issues, send pull requests with fixes and improvements and even send me messages (why not?).
