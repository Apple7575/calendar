import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootScreenProps } from "../navigation/types";
import { colors, fontSizes, spacing } from "../theme/tokens";

const { width: SCREEN_W } = Dimensions.get("window");

export function PhotoViewerScreen({ route, navigation }: RootScreenProps<"PhotoViewer">) {
  const { urls, index } = route.params;
  const [current, setCurrent] = useState(index);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        keyExtractor={(u, i) => `${i}-${u}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
        }
        renderItem={({ item }) => (
          <View style={styles.page}>
            <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
          </View>
        )}
      />
      <View style={styles.topBar} pointerEvents="box-none">
        <Text style={styles.counter}>
          {current + 1} / {urls.length}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.close}>닫기 ✕</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  page: { width: SCREEN_W, justifyContent: "center" },
  image: { width: SCREEN_W, height: "100%" },
  topBar: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  counter: { color: colors.white, fontSize: fontSizes.body, fontWeight: "700" },
  close: { color: colors.white, fontSize: fontSizes.body, fontWeight: "700" },
});
