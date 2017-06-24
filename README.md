# Maestro

Maestro is an Orchestrator based on [iNGector](https://github.com/Codifica208/iNGector) (which is a Dependency Injection module inspired by the AngularJS's DI).

### So ... what are the changes between Maestro and iNGector?

After using iNGector in several projects we missed some features, and struggled with some aspects of it. So here's what's changed.

- ##### No more CoffeeScript source code.
As ES6 brought arrow functions and some improvements on loop iterations we felt that there was no need to use CoffeeScript anymore.

- ##### Message Broadcast.
We realized after some effort that even with an direct relationship between the modules provided an event notifying feature was missed. In some cases we had more than 1 publisher of the same message type and we didn't like that the publisher has to known the subscribers neither that we have to had a phase where subscribers strictly register themselves to the providers.
So we just simplified with a generic listen/broadcast message bus style.

- ##### Dependencies by class.
Now you dont have to depend upon a giant list of similar modules. You just cast them as a group using the **.class** convention.

- ##### No more Web Browser mode.
There are tons of frameworks to develop front-ends (e.g.: Aurelia.io) which has their own organization style. So we droped out the web browser mode.

Some times we scenarios like dbcontext configuration, where theres a main piece of code that builds the context and there other files (children) that configurates the entities, in this case we have to explicitly make the main piece dependent of the children. As the children files grows the most we get unhappy with the main's definition.
In C# we used to do reflections or ask for any classes that implements some interface.
Based on that solution we added the possibility to depend on a Class of modules.

### Why another Dependency Injection module?

As we could not find any other simple and elegant DI module as AngularJS's one, we took its style and implemented a simple promise based version of it.

## How does it works?

iNGector has two main methods: **provide** and **init**, which are similar to AngularJS's DI *config* and *run*.


#### The PROVIDE method

This method allows you to serve some implementation that can be requested by other parts.

It accepts the following arguments:

- **name**: an identifier for the provided implementation
- **dependencies**: all names of the parts (previously provided) needed by your piece of code
- **builder function**: a function that will be called to this part. It receives all the declared dependencies as arguments and must return a Promise.

```javascript
.provide('my-piece-of-code', 'some-dependency', 'some-other-dependency', function (){
	return Promise.resolve({
		showMessage: function(message) {
			alert(message);
		}
	})
});
```

#### The INIT method

This method allows you to run a piece of code after all provided implementation is set.

It accepts the following arguments:

- **dependencies**: all names of the parts (previously provided) needed by your piece of code
- **run function**: a function that will be called after all provided blocks are processed. It also receives all the declared dependencies as arguments.

```javascript
.init('my-piece-of-code', function (part) {
	part.showMessage('App is running!!');
});
```


#### Chaining method calls

Both PROVIDE and INIT methods can be chained to each other, so you can call them like this:

```javascript
.provide('mod-b', 'mod-a', function(modA){...})
.provide('mod-a', function(){...})
.init(function(){...});
```

ps.: as you may notice, they do not need to be called in the correct order of dependency needs, iNGector will handle this for you.


### OK, all parts provided and all init blocks registered! Now what?!

#### The START method

This method tells iNGector that it must prepare and go. This is achieved in three phases:

1. ChainSolve Phase: solve the dependency chain and queue builder functions in needed order.
2. ExecuteProvideBlocks Phase: call all builder functions in needed order.
3. ExecuteInitBlocks Phase: call all run functions.

It needs no arguments and returns a Promise that resolves with iNGector instance as result.

```javascript
.start()
.then(function(di){
	// di is the iNGector instance
	console.log('All good!');
})
.catch(function(error){
	console.log('Some error occured: ' + error);
});
```


#### The RESOLVE method
Once iNGector is started, you can call *resolve* method to get a piece of code previously provided.

It accepts the name as the only argument.

```javascript
.start()
.then(function(di){
	di.resolve('my-piece-of-code').showMessage('See!?');
});
```


## Usage in Web Clients

### Promises

Since iNGector uses Promises and not all browsers supports it natively, you may need to add a SCRIPT tag BEFORE the iNGector one to a Promises implementation.
We recommend you to use A+ [Promisejs](https://www.promisejs.org/).

### Adding iNGector to your web application

1. Download the latest compiled version [here](https://github.com/Codifica208/iNGector/blob/master/dist/iNGector.js). (sorry it is not minified yet)
2. Add a SCRIPT tag in your page before your implemantations files.

```html
<!-- If you want to support older browsers, add a Promises implementation of your preference.
<script type="text/javascript" src="[path_to_file]/promise.js"></script>-->
<script type="text/javascript" src="[path_to_file]/iNGector.js"></script>
<!-- Now all your implementation scripts -->
<script type="text/javascript" src="[path_to_file]/[some_implementation].js"></script>
<script type="text/javascript" src="[path_to_file]/[another_implementation].js"></script>
```


### Accessing the iNGector instance

When added to a HTML page, iNGector declares a global variable named **di** which is an iNGector instance (we really don't see the point of having two instances of it).
As we know the order of registration (provides and inits) does not count, you can add your implementation scripts in ANY order.

```javascript
// some_implementation.js
di.provide('mod-b', 'mod-a', function(modA) {
	// ....
});
```

```javascript
// other_implementation.js
di.provide('mod-a', function() {
	// ....
})
.init('mod-b', function(modB){
	// ....
});
```


### Calling the START method once

There are several ways to achieve that, one is

- Add the START call in a separated file and assure that the SCRIPT tag pointing to this file is always the last one.

and another is (our favorite)

- Using [jQuery Ready](http://api.jquery.com/ready/) function.

	```javascript
	$(function(){ di.start(); });
	```

	ps.: note that the code above must be executed only once, and (of course) you'll need to add jQuery to your application.


## Usage in Node.js

You can use iNGector in Node.js as well. For this scenario, we've prepared some extra features.

### NPM package

iNGector is available at NPM under the (lowered) name [ingector](https://www.npmjs.com/package/ingector) and can be installed with the command:

```bash
npm install ingector
```

then just require and execute

```javascript
var di = require('ingector')()
```


### Extra features

As you may have noticed, we invoke the result of the **require** function.
This is necessary because our module.exports returns a function that creates an instance of iNGector and then add some new methods to that instance.

#### The LOADFILES method

This method loads all requested files through **require** and then invoke the result passing the iNGector instance.

It accepts files paths as arguments.

```javascript
di.loadFiles('/controllers/my-controller', '/config/server');
```

In order to **loadFiles** to work, all loaded files must exports a function that accepts the iNGector instance as argument.

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

#### The SETDIR method

Sometimes you may found yourself having problems of relative path with Node's **require** function.
To avoid this, it is common to use the **__dirname** variable, which gives you the current path location, in order to set the start point of relative paths.
As iNGector usually is in **node_modules** folder, we added this method to allow you to specify this start point.

It accepts a path as the only argument.

```javascript
di.setDir(__dirname + '/src');
```

ps.: it must be called before LOADFILES and LOADDIRS methods.

#### Chaining method calls

All of LOADFILES, LOADDIRS and SETDIR methods can be chained to each other, so you can call them like this:

```javascript
di.setDir(__dirname + '/src').loadDirs('/controllers', '/config').loadFiles('/start/app');
```

## Public methods you may found

If you debug or read the source code you will find two more public methods.
Both are used in order to achieve some stuff and you probably won't play with.

#### The CHECKINITIALIZATION method

This method throws an exception if iNGector is not initialized yet.

#### The PREINIT method

This method is created only when executing in Node.js. It tells core to load files before the START Phases.

## Error handling
Last but not least, iNGector throws exceptions with the following messages:

- **[iNGector] Error running provide blocks: [ERROR]**. Occurs whenever a Promise catches an error during *ChainSolve Phase* or *ExecuteProvideBlocks Phase*.

- **[iNGector] Error running init blocks: [ERROR]**. Occurs whenever a Promise catches an error during *ExecuteProvideBlocks Phase*.

- **[iNGector] Already initialized!**. Occurs when:
	- PROVIDE, INIT or START methods are called after initialization.
	- LOADFILES or LOADDIRS methods are called after initialization. (node only)

- **[iNGector] Start already called!**. Occurs when START method is called more than once.

- **[iNGector] Cannot get [DEPENDENCY NAME]. iNGector is not initialized yet!**. Occurs when RESOLVE method is called before the initialization.

- **[iNGector] Block [DEPENDENCY NAME] not provided!**. Occurs when RESOLVE method cannot find any part with given name.

## Contributing
iNGector is under [MIT LICENSE](/LICENSE.md). You can use, copy, change and so on.
Feel free to open issues, send pull requests with fixes and improvements and even send me messages (why not?).
