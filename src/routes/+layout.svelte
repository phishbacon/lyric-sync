<script>import "../app.css";
import "../app.postcss";
import { AppShell, AppBar } from "@skeletonlabs/skeleton";</script>

<!-- App Shell -->
<AppShell>
	<svelte:fragment slot="header">
		<!-- App Bar -->
		<AppBar>
			<svelte:fragment slot="lead">
				<strong class="text-xl uppercase">Lyric-Sync</strong>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<a class="btn btn-sm variant-ghost-surface" href="https://discord.gg/EXqV7W8MtY" target="_blank" rel="noreferrer">
					Login
				</a>
				<a class="btn btn-sm variant-ghost-surface" href="https://twitter.com/SkeletonUI" target="_blank" rel="noreferrer">
					Register
				</a>
				<a class="btn btn-sm variant-ghost-surface" href="https://github.com/skeletonlabs/skeleton" target="_blank" rel="noreferrer">
					View Library
				</a>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<!-- Page Route Content -->
	<slot></slot>
</AppShell>
