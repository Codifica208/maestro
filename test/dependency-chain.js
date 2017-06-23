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

	it('Should return all dependencies by class', (done) => {
		let _di = new Maestro();
		_di
			.provide('A', '.B', (bs) => {
				bs.length.should.be.exactly(3);
				bs.indexOf('B1').should.be.above(-1);
				bs.indexOf('B2').should.be.above(-1);
				bs.indexOf('B3').should.be.above(-1);
				done();

				return Promise.resolve();
			})
			.provide('B1.B', () => Promise.resolve('B1'))
			.provide('B2.B', () => Promise.resolve('B2'))
			.provide('B3.B', () => Promise.resolve('B3'))
			.start()
			.catch(done);
	});

	it('Should return all dependencies by class between singles', (done) => {
		let _di = new Maestro();
		_di
			.provide('A', 'C', '.B', 'D', (c, bs, d) => {
				c.should.be.exactly('C');
				d.should.be.exactly('D');
				bs.length.should.be.exactly(3);
				bs.indexOf('B1').should.be.above(-1);
				bs.indexOf('B2').should.be.above(-1);
				bs.indexOf('B3').should.be.above(-1);
				done();

				return Promise.resolve();
			})
			.provide('B1.B', () => Promise.resolve('B1'))
			.provide('B2.B', () => Promise.resolve('B2'))
			.provide('B3.B', () => Promise.resolve('B3'))
			.provide('C', () => Promise.resolve('C'))
			.provide('D', () => Promise.resolve('D'))
			.start()
			.catch(done);
	});

	it('Should return all dependencies class grouped between singles with more than one group', (done) => {
		let _di = new Maestro();
		_di
			.provide('A', 'B', '.C', 'D', '.E', (b, cs, d, es) => {
				b.should.be.exactly('B');
				cs.length.should.be.exactly(2);
				cs.indexOf('C1').should.be.above(-1);
				cs.indexOf('C2').should.be.above(-1);
				es.length.should.be.exactly(2);
				es.indexOf('E1').should.be.above(-1);
				es.indexOf('E2').should.be.above(-1);
				d.should.be.exactly('D');
				done();

				return Promise.resolve();
			})
			.provide('B', () => Promise.resolve('B'))
			.provide('C1.C', () => Promise.resolve('C1'))
			.provide('C2.C', () => Promise.resolve('C2'))
			.provide('D', () => Promise.resolve('D'))
			.provide('E1.E', () => Promise.resolve('E1'))
			.provide('E2.E', () => Promise.resolve('E2'))
			.start()
			.catch(done);
	});
});
