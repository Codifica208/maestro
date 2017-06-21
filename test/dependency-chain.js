let Maestro = require('../maestro');

describe('Dependency chain', () => {
	it('Should invoke providers ordered by dependency needs', (done) => {
		let _invoked = [];
		let _di = new Maestro();
		_di
			.provide('A', () => {
				_invoked.push('A');
				return Promise.resolve();
			})
			.provide('B', 'A', A => {
				_invoked.push('B');
				return Promise.resolve();
			})
			.provide('C', 'B', B => {
				_invoked.push('C');
				return Promise.resolve();
			})
			.provide('D', 'F', 'C', 'B', (C, B) => {
				_invoked.push('D');
				return Promise.resolve();
			})
			.provide('E', 'D', D => {
				_invoked.push('E');
				return Promise.resolve();
			})
			.provide('F', 'A', A => {
				_invoked.push('F');
				return Promise.resolve();
			})
			.start()
			.then(() => {
				_invoked[0].should.be.exactly('A');
				_invoked[4].should.be.exactly('D');
				_invoked[5].should.be.exactly('E');
				done();
			})
			.catch(done);
	});

	it('Should reject with "Dependency not found" exception when a provider\'s dependency is not found', (done) => {
		let _di = new Maestro();
		_di
			.provide('A', 'not-registered-dependency', () => Promise.resolve())
			.start()
			.then(() => done('Got resolved'))
			.catch(error => {
				error.should.containEql('[Maestro] Error running providers:');
				error.should.containEql('Dependency not found (not-registered-dependency)');
				done();
			});
	});

	it('Should reject with "Dependency not found" exception when a init\'s dependency is not found', (done) => {
		let _di = new Maestro();
		_di
			.init('not-registered-dependency', DEP => '')
			.start()
			.then(() => done('Finished'))
			.catch(error => {
				error.should.containEql('[Maestro] Error running inits:');
				error.should.containEql('Dependency not found (not-registered-dependency)');
				done();
			});
	});
});
