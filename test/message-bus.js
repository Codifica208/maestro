let Maestro = require('../maestro');

describe('Message bus', () => {
	it('Should notify all subscribers when a message was published', (done) => {
		let _di = new Maestro();
		let key = 'event-notification';
		let notifiedSubscribers = [];

		_di
			.listen(key, function(data) {
				notifiedSubscribers.push('subscriber-a');
			})
			.listen(key, function(data) {
				notifiedSubscribers.push('subscriber-b');
			})
			.start()
			.then(() => _di.broadcast(key, {}))
			.then(() => {
				notifiedSubscribers.length.should.be.exactly(2);
				done();
			})
			.catch(done);
	});

	it('Should not notify ignored subscribers when a message was published', (done) => {
		let _di = new Maestro();
		let key = 'event-notification';
		let notifiedSubscribers = [];

		let subscriberA = function(data) {
			notifiedSubscribers.push('subscriber-a');
		};

		_di
			.listen(key, subscriberA)
			.listen(key, function(data) {
				notifiedSubscribers.push('subscriber-b');
			})
			.start()
			.then(() => _di.broadcast(key, {}))
			.then(() => {
				notifiedSubscribers.length.should.be.exactly(2);
				notifiedSubscribers = [];

				_di.ignore(key, subscriberA);
				return _di.broadcast(key, {});
			})
			.then(() => {
				notifiedSubscribers.length.should.be.exactly(1);
				done();
			})
			.catch(done);
	});
});
