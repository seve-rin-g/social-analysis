var filename = "data2.json"

        // Load data
        d3.json(filename).then(data => {
            // Populate dropdown with node names
            const dropdown = document.getElementById('node-filter-dropdown');
            data.nodes.forEach(node => {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = node.alias;
                dropdown.appendChild(option);
            });
            // Set dimensions
            const width = 1000;
            const height = 1000;

            var relationshipTypes = Array.from(new Set(data.links.map(l => l.relationship)));
            // Create SVG
            const svg = d3.select('#visualization')
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            // Store original data for filtering
            // Normalize relationship types for consistency (e.g., 'hooked up' -> 'hooked-up')
            const normalizeType = t => t.replace(/\s+/g, '-').toLowerCase();
            data.links.forEach(l => { l.relationship = normalizeType(l.relationship); });
            const allLinks = data.links;
            const allNodes = data.nodes;
            let filteredNodeIds = [];

            // Create force simulation
            const simulation = d3.forceSimulation(allNodes)
                .force('link', d3.forceLink([])
                    .id(d => d.id)
                    .distance(100))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(40));

            // Create links group
            const linksGroup = svg.append('g').attr('id', 'links-group');
            let links = linksGroup.selectAll('path');

            // Create nodes
            const nodes = svg.append('g')
                .selectAll('circle')
                .data(allNodes)
                .enter()
                .append('circle')
                .attr('class', 'node')
                .attr('r', 35)
                .attr('fill', (d, i) => {
                    const colors = ['#3498db', '#9b59b6', '#1abc9c'];
                    return colors[i % colors.length];
                })
                .call(d3.drag()
                    .on('start', dragStarted)
                    .on('drag', dragged)
                    .on('end', dragEnded))
                .on('mouseenter', function (event, d) {
                    d3.select('#tooltip')
                        .style('display', 'block')
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY + 10) + 'px')
                        .html(`<strong>${d.alias}</strong><br/>Id: ${d.id}`);
                })
                .on('mousemove', function (event) {
                    d3.select('#tooltip')
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY + 10) + 'px');
                })
                .on('mouseleave', function () {
                    d3.select('#tooltip')
                        .style('display', 'none');
                });

            // Create labels
            const labels = svg.append('g')
                .selectAll('text')
                .data(allNodes)
                .enter()
                .append('text')
                .attr('class', 'node-label')
                .text(d => d.alias);

            // Function to update links and simulation based on checkboxes
            function computeLinkCurvature(links) {
                // Group links by source-target pair (undirected)
                const pairMap = {};
                links.forEach((l, i) => {
                    // Use min/max to make undirected
                    const key = [l.source.id || l.source, l.target.id || l.target].sort().join('---');
                    if (!pairMap[key]) pairMap[key] = [];
                    pairMap[key].push(l);
                });
                // Assign index and total count to each link
                links.forEach((l, i) => {
                    const key = [l.source.id || l.source, l.target.id || l.target].sort().join('---');
                    l.linkIndex = pairMap[key].indexOf(l);
                    l.linkTotal = pairMap[key].length;
                });
            }

            function updateLinksAndSimulation() {
                // Get checked types
                const checkedTypes = Array.from(document.querySelectorAll('.toggle-relationship:checked')).map(cb => cb.getAttribute('data-type'));
                // Get filtered node ids
                filteredNodeIds = Array.from(dropdown.selectedOptions).map(opt => parseInt(opt.value));

                // Filter nodes and links
                const visibleNodes = allNodes.filter(n => !filteredNodeIds.includes(n.id));
                const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
                const filteredLinks = allLinks.filter(l => checkedTypes.includes(l.relationship) && visibleNodeIds.has(l.source.id || l.source) && visibleNodeIds.has(l.target.id || l.target));

                // Compute curvature info
                computeLinkCurvature(filteredLinks);

                // Update links selection (use path instead of line)
                links = linksGroup.selectAll('path')
                    .data(filteredLinks, d => `${d.source.id || d.source}-${d.target.id || d.target}-${d.relationship}`);

                links.exit().remove();

                links = links.enter()
                    .append('path')
                    .attr('class', d => `link ${d.relationship}`)
                    .attr('stroke-width', 2)
                    .merge(links);

                // Set stroke-dasharray based on 'active' property
                links.each(function(d) {
                    // Treat undefined 'active' as true (solid)
                    if (d.active == false) {
                        d3.select(this).attr('stroke-dasharray', '5,5');
                    } else {
                        d3.select(this).attr('stroke-dasharray', null);
                    }
                });

                // Update force simulation links and nodes
                simulation.nodes(visibleNodes);
                simulation.force('link').links(filteredLinks);
                simulation.alpha(0.5).restart();

                // Update node circles
                nodes.data(visibleNodes, d => d.id)
                    .join(
                        enter => enter.append('circle')
                            .attr('class', 'node')
                            .attr('r', 35)
                            .attr('fill', (d, i) => {
                                const colors = ['#3498db', '#9b59b6', '#1abc9c'];
                                return colors[i % colors.length];
                            })
                            .call(d3.drag()
                                .on('start', dragStarted)
                                .on('drag', dragged)
                                .on('end', dragEnded))
                            .on('mouseenter', function (event, d) {
                                d3.select('#tooltip')
                                    .style('display', 'block')
                                    .style('left', (event.pageX + 10) + 'px')
                                    .style('top', (event.pageY + 10) + 'px')
                                    .html(`<strong>${d.name}</strong><br/>Id: ${d.id}`);
                            })
                            .on('mousemove', function (event) {
                                d3.select('#tooltip')
                                    .style('left', (event.pageX + 10) + 'px')
                                    .style('top', (event.pageY + 10) + 'px');
                            })
                            .on('mouseleave', function () {
                                d3.select('#tooltip')
                                    .style('display', 'none');
                            }),
                        update => update,
                        exit => exit.remove()
                    );

                // Update labels
                labels.data(visibleNodes, d => d.id)
                    .join(
                        enter => enter.append('text')
                            .attr('class', 'node-label')
                            .text(d => d.name),
                        update => update,
                        exit => exit.remove()
                    );
            }

            // Initial render
            updateLinksAndSimulation();

            // Checkbox event listeners
            document.querySelectorAll('.toggle-relationship').forEach(cb => {
                cb.addEventListener('change', function () {
                    updateLinksAndSimulation();
                });
            });
            // Dropdown event listener
            dropdown.addEventListener('change', function () {
                updateLinksAndSimulation();
            });

            // Update positions on simulation tick
            simulation.on('tick', () => {
                links
                    .attr('d', function (d) {
                        // If only one link, draw straight line
                        if (d.linkTotal === 1) {
                            return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
                        }
                        // Multiple links: curve
                        const dx = d.target.x - d.source.x;
                        const dy = d.target.y - d.source.y;
                        const dr = 60 + (d.linkIndex - (d.linkTotal - 1) / 2) * 10; // spread curves
                        // Calculate normal for offset direction
                        const mx = (d.source.x + d.target.x) / 2;
                        const my = (d.source.y + d.target.y) / 2 + + (relationshipTypes.indexOf(d.relationship)+1)*2;
                        const norm = Math.sqrt(dx * dx + dy * dy);
                        const offsetX = -dy / norm * dr + (relationshipTypes.indexOf(d.relationship)+1)*50; // add some randomness to prevent perfect overlap
                        const offsetY = dx / norm * dr; // add some randomness to prevent perfect overlap
                        const cx = mx + offsetX;
                        const cy = my + offsetY;
                        return `M${d.source.x},${d.source.y}Q${cx},${cy} ${d.target.x},${d.target.y}`;
                    });

                // Only render visible nodes and labels
                nodes.filter(d => !filteredNodeIds.includes(d.id))
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);

                labels.filter(d => !filteredNodeIds.includes(d.id))
                    .attr('x', d => d.x)
                    .attr('y', d => d.y);
            });

            // Drag functions
            function dragStarted(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragEnded(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }
        }
    
    );