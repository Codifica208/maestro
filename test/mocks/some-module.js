module.exports = (di) => {
	di
		.provide('SOME-MODULE', 'A', A => Promise.resolve({ name: 'some-module' }))
		.init('A', A => {
			// do nothing
		});
};
