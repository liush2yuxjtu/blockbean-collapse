export const randomRoast = () => [
  '这波不是你菜，是地板先破防。',
  '推得很有气势，落地还可以再稳一点。',
  '最后一豆称王，豆汁都替你沸腾了。',
  '小红书标题：我在方块岛上把对手推没了。',
  '剪映素材已就位：塌了就出局，下一局见。'
][Math.floor(Math.random() * 5)];
export const formatShareText = ({ score, won, best, roast, url, variant = won ? 'win' : 'defeat', handle = '' }) => {
  const title = variant === 'clutch' ? '最后一秒完成反杀，最后一豆称王！' : variant === 'win' ? '最后一豆称王！' : '差一点就赢了！';
  return (handle ? '@' + handle + '：' : '') + '我在《方块豆人：塌了就出局》拿了 ' + score + ' 推人分，' + title + ' ' + roast +
    ' 连胜最佳 ' + best + '。' + url;
};
export const setText = (node, text) => { if (node) node.textContent = text; };
