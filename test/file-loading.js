let Maestro = require('../maestro');

describe('File loading', () => {
	it('Should load module in another file', (done) => {
		let _di = new Maestro(`${__dirname}/mocks`);
		_di
			.loadFiles('./some-module')
			.provide('A', () => Promise.resolve())
			.start()
			.then(() => {
				_di.resolve('SOME-MODULE').name.should.be.exactly('some-module');
				done();
			})
			.catch(done);
	});

	it('Should reject when could not load requested files', (done) => {
		let _di = new Maestro();
		_di
			.loadFiles('file-that-does-not-exists')
			.start()
			.then(() => done('Finished'))
			.catch(error => {
				error.should.containEql('[Maestro] Error loading files');
				done();
			});
	});
});
