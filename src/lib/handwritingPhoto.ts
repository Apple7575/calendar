import type {Action} from 'expo-image-manipulator';

type Photo={width:number;height:number;exif?:Record<string,unknown>|null};
const LONGEST=2200;
/**
 * Notes are always shot held upright (user decision 2026-11-05), but the phone guesses direction from gravity, and pointed
 * down at a desk it keeps whatever it last saw. The sensor is fixed to the phone, so the saved direction says how far
 * the photo is from upright: 6 is upright, 1 and 3 are the two landscape sides, 8 is upside down.
 */
const TURN_FROM_SAVED:Record<number,number>={6:0,1:90,3:270,8:180};
export function portraitTurn(photo:Photo){
 return TURN_FROM_SAVED[Number(photo.exif?.Orientation)]??(photo.width>photo.height?90:0);
}
/** Turning comes first: the size limit applies to the photo as it will be kept. */
export function handwritingPhotoActions(photo:Photo):Action[]{
 const turn=portraitTurn(photo),sideways=turn===90||turn===270,width=sideways?photo.height:photo.width,height=sideways?photo.width:photo.height;
 return [...(turn?[{rotate:turn}]:[]),...(Math.max(width,height)>LONGEST?[{resize:width>=height?{width:LONGEST}:{height:LONGEST}}]:[])];
}
