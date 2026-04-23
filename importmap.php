<?php

/**
 * Returns the importmap for this application.
 *
 * - "path" is a path inside the asset mapper system. Use the
 *     "debug:asset-map" command to see the full list of paths.
 *
 * - "entrypoint" (JavaScript only) set to true for any module that will
 *     be used as an "entrypoint" (and passed to the importmap() Twig function).
 *
 * The "importmap:require" command can be used to add new entries to this file.
 */
return [
    'app' => [
        'path' => './assets/app.js',
        'entrypoint' => true,
    ],
    '@hotwired/stimulus' => [
        'version' => '3.2.2',
    ],
    '@symfony/stimulus-bundle' => [
        'path' => './vendor/symfony/stimulus-bundle/assets/dist/loader.js',
    ],
    '@hotwired/turbo' => [
        'version' => '7.3.0',
    ],
    'bootstrap' => [
        'version' => '5.3.8',
    ],
    '@popperjs/core' => [
        'version' => '2.11.8',
    ],
    'bootstrap/dist/css/bootstrap.min.css' => [
        'version' => '5.3.8',
        'type' => 'css',
    ],
    'vue' => [
        'path' => './assets/vendor/vue.esm-browser.js',
        'entrypoint' => false,
    ],
    /*'@vue/runtime-dom' => [
        'version' => '3.5.25',
    ],
    '@vue/runtime-core' => [
        'version' => '3.5.25',
    ],
    '@vue/shared' => [
        'version' => '3.5.25',
    ],
    '@vue/reactivity' => [
        'version' => '3.5.25',
    ],*/
    '@symfony/ux-vue' => [
        'path' => './vendor/symfony/ux-vue/assets/dist/loader.js',
    ],
    '@vuepic/vue-datepicker' => [
        'version' => '12.1.0',
    ],
    'date-fns' => [
        'version' => '4.1.0',
    ],
    '@vueuse/core' => [
        'version' => '14.1.0',
    ],
    '@floating-ui/vue' => [
        'version' => '1.1.9',
    ],
    '@date-fns/tz' => [
        'version' => '1.4.1',
    ],
    '@vuepic/vue-datepicker/dist/main.min.css' => [
        'version' => '12.1.0',
        'type' => 'css',
    ],
    '@vueuse/shared' => [
        'version' => '14.1.0',
    ],
    '@floating-ui/dom' => [
        'version' => '1.7.4',
    ],
    '@floating-ui/utils/dom' => [
        'version' => '0.2.10',
    ],
    'vue-demi' => [
        'version' => '0.14.10',
    ],
    '@floating-ui/core' => [
        'version' => '1.7.3',
    ],
    '@floating-ui/utils' => [
        'version' => '0.2.10',
    ],
    'date-fns/locale' => [
        'version' => '4.1.0',
    ],
];
