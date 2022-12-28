exports.test = [
  {
    name: 'test',
    url: 'http://localhost:8000/remmoteEntry.js',
    path: '/Users/kylefahey/OCVIBE/module-federation/aegis/__test__/use-cases',
    type: 'model',
    importRemote: () => import('test/models'),
  },
]
