/** 입력칸 아래쪽이 키보드에 가리면 얼마나 올려야 하는지 계산한다. 키보드 위로 여백을 남긴다. */
export function keyboardScrollDelta(fieldBottom:number,keyboardTop:number,margin=16){
 return Math.max(0,fieldBottom+margin-keyboardTop);
}
