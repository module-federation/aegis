exports.test = [
  {
    name: 'test',
    url: 'http://localhost:8000/remmoteEntry.js',
    path: '/Users/tysonmidboe/aegis/__test__/use-cases',
    type: 'model',
    importRemote: () => import('test/models'),
  },
]
