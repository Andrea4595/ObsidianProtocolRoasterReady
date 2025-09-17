/**
 * 이 파일은 특정 카드에만 적용되는 예외적인 규칙들을 중앙에서 관리합니다.
 * 여기에 있는 함수들은 렌더링 또는 게임 로직 계산 직전에 호출되어,
 * special 속성을 기반으로 카드 객체의 속성을 동적으로 변경하거나 추가합니다.
 */

/**
 * 유닛 전체에 적용되는 규칙을 처리합니다.
 * @param {object} unit - 유닛 객체 (e.g., { Pilot: card, Chassis: card, ... })
 */
export function applyUnitRules(unit) {
    if (!unit) return;

    const pilot = unit.Pilot;
    const chassis = unit.Chassis;

    // 규칙: '앙세르' 파일럿은 섀시 카드에 'frame' 속성을 부여합니다.
    if (pilot && pilot.special?.includes('chassis_have_frame') && chassis) {
        chassis.frame = true;
    }
}

/**
 * 드론 카드에 적용되는 규칙을 처리합니다.
 * @param {object} drone - 드론 카드 객체
 */
export function applyDroneRules(drone) {
    if (!drone) return;

    // 규칙: 'ADK30C' 드론은 'Back' 슬롯을 가집니다.
    if (drone.special?.includes('freight_back')) {
        drone.hasFreightBack = true;
    }
}
