export const createInputState = () => ({
  keys: Object.create(null), touch: { x: 0, z: 0, jump: false, push: false },
  mousePush: false, mousePush2: false
});
export const readPlayerInput = (input, binding) => {
  const key = code => Boolean(input.keys[code]);
  // Keyboard is digital; touch stick is analog (-1..1). Combined vector is smoothed in control().
  const mx = (key(binding.right) ? 1 : 0) - (key(binding.left) ? 1 : 0) + input.touch.x;
  const mz = (key(binding.down) ? 1 : 0) - (key(binding.up) ? 1 : 0) + input.touch.z;
  const push = binding.push.some(code => code === 'Mouse0' ? input.mousePush : code === 'Mouse1' ? input.mousePush2 : key(code));
  return { mx, mz, jump: key(binding.jump) || input.touch.jump, push };
};
