module.exports = function(grunt) {

	grunt.initConfig({
		concat: {
			options: {
				separator: ';\n',
				sourceMap: true,
			},
			dist: {
				src: ['src/parse-bibtex.js', 'src/citation.js', 'src/footnote.js', 'src/bibcite.js'],
				dest: 'dist/bibcite.js',
			},
		},

		uglify: {
			options: {
				sourceMap: true
			},
			my_target: {
				files: {
					'dist/bibcite.min.js': ['src/parse-bibtex.js', 'src/citation.js', 'src/footnote.js', 'src/bibcite.js']
				}
			}
		},

		sass: {
			dist: {
				files: {
					'dist/bibcite.css': 'src/bibcite.scss',
					'demo/demo.css': 'demo/demo.scss'
				}
			}
		},

		watch: {
			files: ['src/*', 'demo/highlight.scss', 'demo/*', 'index.html'],
			tasks: ['newer:concat', 'newer:sass']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-newer');

	grunt.registerTask('default', ['concat', 'uglify', 'sass']);
}