import React from 'react';
import type {GoalDateInputProps} from './GoalDateInput';
import {Field} from './ui';

/** 웹 미리보기에는 네이티브 날짜 선택기가 없어 글자로 입력한다. 형식은 저장할 때 검증한다. */
export function GoalDateInput({value,onChange}:GoalDateInputProps){
 return <Field label="목표 날짜 (선택)" value={value} onChangeText={onChange} placeholder="2026-12-06" maxLength={10}/>;
}
