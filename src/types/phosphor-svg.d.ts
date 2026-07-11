// phosphor-react-native는 TS 소스를 그대로 배포하는데, 내부에서 Svg에
// className을 넘겨 react-native-svg 타입과 충돌한다(런타임 무해).
// 타입만 보강해서 tsc를 통과시킨다.

import "react-native-svg";

declare module "react-native-svg" {
  interface SvgProps {
    className?: string;
  }
}
