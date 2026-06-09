// WikiLinkText — tappable [[wiki links]] with Obsidian-style popover
// Single tap → floating preview card; Double tap → navigate
import React, { useState, useRef, useCallback } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { ParsedNode } from '../lib/markdownParser';
import CardPopover from './CardPopover';

const DOUBLE_TAP_DELAY = 350;

interface Props {
  nodes: ParsedNode[];
  onLinkPress?: (linkPath: string) => void;
}

function WikiLink({ linkPath, text, isSpeed }: { linkPath: string; text: string; isSpeed?: boolean }) {
  const router = useRouter();
  const [popoverPath, setPopoverPath] = useState<string | null>(null);
  const lastTap = useRef(0);

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap — navigate
      lastTap.current = 0;
      navigateTo(linkPath);
    } else {
      // First tap — start timer for popover
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          // Timer expired without second tap → show popover
          setPopoverPath(linkPath);
        }
      }, DOUBLE_TAP_DELAY);
    }
  }, [linkPath]);

  function navigateTo(p: string) {
    if (p.startsWith('骨架/')) {
      router.push(`/skeleton/${encodeURIComponent(p.replace('骨架/', '').replace('.md', ''))}`);
    } else if (p.startsWith('临床锚点/')) {
      router.push(`/anchor/${encodeURIComponent(p)}`);
    } else if (p === '00-总入口' || p === '00-总入口.md') {
      router.push('/overview');
    } else {
      router.push(`/card/${encodeURIComponent(p)}`);
    }
  }

  return (
    <Text>
      {' '}
      <Pressable onPress={handlePress}>
        <Text style={[styles.link, isSpeed && styles.speedAnchor]}>
          {isSpeed ? '📖 ' : ''}{text}
        </Text>
      </Pressable>
      <CardPopover
        visible={popoverPath !== null}
        cardPath={popoverPath || ''}
        displayName={text}
        onClose={() => setPopoverPath(null)}
      />
    </Text>
  );
}

export default React.memo(function WikiLinkText({ nodes, onLinkPress }: Props) {
  const router = useRouter();

  if (!nodes.length) return <Text> </Text>;

  return (
    <Text style={styles.line}>
      {nodes.map((node, i) => {
        if (!node.isWikiLink) {
          return <Text key={i} style={styles.plain}>{node.text}</Text>;
        }

        if (!node.linkPath || node.linkPath.trim() === '') {
          return (
            <Text key={i}>
              {' '}
              <Pressable onPress={() => router.push('/card/edit/new')}>
                <Text style={styles.emptyLink}>{node.text || '(待填写)'}</Text>
              </Pressable>
            </Text>
          );
        }

        // Use custom handler if provided, otherwise use popover-enabled link
        if (onLinkPress) {
          return (
            <Text key={i}>
              {' '}
              <Pressable onPress={() => onLinkPress(node.linkPath!)}>
                <Text style={[styles.link, node.isSpeedAnchor && styles.speedAnchor]}>
                  {node.isSpeedAnchor ? '📖 ' : ''}{node.text}
                </Text>
              </Pressable>
            </Text>
          );
        }

        return (
          <WikiLink
            key={i}
            linkPath={node.linkPath!}
            text={node.text}
            isSpeed={node.isSpeedAnchor}
          />
        );
      })}
    </Text>
  );
});

const styles = StyleSheet.create({
  line: { fontSize: 15, lineHeight: 22, color: '#E8EDF5' },
  link: { color: '#C8A45C', fontWeight: '600' },
  speedAnchor: { color: '#FFB800', fontStyle: 'italic' },
  plain: { color: '#E8EDF5' },
  emptyLink: { color: '#5A6980', fontStyle: 'italic' },
});
