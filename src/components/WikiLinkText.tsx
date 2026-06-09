// Component for rendering [[wiki links]] as tappable blue text
// Default: navigates to card when tapped. Can override with onLinkPress.
import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import type { ParsedNode } from '../lib/markdownParser';

interface Props {
  nodes: ParsedNode[];
  onLinkPress?: (linkPath: string) => void;
}

export default React.memo(function WikiLinkText({ nodes, onLinkPress }: Props) {
  const router = useRouter();

  const handlePress = (linkPath: string) => {
    if (onLinkPress) {
      onLinkPress(linkPath);
    } else if (linkPath) {
      // Smart routing based on link prefix
      if (linkPath.startsWith('骨架/')) {
        const system = linkPath.replace('骨架/', '').replace('.md', '');
        router.push(`/skeleton/${encodeURIComponent(system)}`);
      } else if (linkPath.startsWith('临床锚点/')) {
        router.push(`/anchor/${encodeURIComponent(linkPath)}`);
      } else if (linkPath === '00-总入口' || linkPath === '00-总入口.md') {
        router.push('/overview');
      } else {
        router.push(`/card/${encodeURIComponent(linkPath)}`);
      }
    }
  };

  if (!nodes.length) {
    return <Text> </Text>;
  }

  return (
    <Text style={styles.line}>
      {nodes.map((node, i) => {
        if (!node.isWikiLink) {
          return <Text key={i} style={styles.plain}>{node.text}</Text>;
        }

        // Empty link [[]] — tappable placeholder to create card
        if (!node.linkPath || node.linkPath.trim() === '') {
          return (
            <Text key={i}>
              {' '}
              <Pressable onPress={() => router.push('/card/edit/new')}>
                <Text style={styles.emptyLink}>
                  {node.text || '(待填写)'}
                </Text>
              </Pressable>
            </Text>
          );
        }

        return (
          <Text key={i}>
            {' '}
            <Pressable onPress={() => handlePress(node.linkPath!)}>
              <Text style={[styles.link, node.isSpeedAnchor && styles.speedAnchor]}>
                {node.isSpeedAnchor ? '📖 ' : ''}{node.text}
              </Text>
            </Pressable>
          </Text>
        );
      })}
    </Text>
  );
});

const styles = StyleSheet.create({
  line: { fontSize: 15, lineHeight: 22, color: '#E8EDF5' },
  link: { color: '#00E5FF', fontWeight: '600' },
  speedAnchor: { color: '#FFB800', fontStyle: 'italic' },
  plain: { color: '#E8EDF5' },
  emptyLink: { color: '#5A6980', fontStyle: 'italic' },
});
