import { describe, expect, it } from 'vitest';
import { toHK } from '../shared/zh';

describe('斗 in fixed words', () => {
  it('keeps 北斗 and converts 战斗', () => {
    expect(toHK('北斗卫星导航系统完成全面在轨升级')).toBe('北斗衛星導航系統完成全面在軌升級');
    expect(toHK('北斗衛星導航系統')).toBe('北斗衛星導航系統');
    expect(toHK('战斗')).toBe('戰鬥');
  });
});
